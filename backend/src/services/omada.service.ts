// backend/src/services/omada.service.ts
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import logger from '../config/logger';
import { NetworkClient, NetworkDevice } from '../types';

type TokenResponse = {
  errorCode: number;
  msg: string;
  result?: {
    accessToken?: string;
    expiresIn?: number;
  };
};

type ApiResponse<T> = {
  errorCode: number;
  msg: string;
  result?: T;
};

class OmadaService {
  private client: AxiosInstance;

  private baseUrl: string;

  // Optional now: we can auto-discover if not provided or unauthorized
  private configuredSiteId: string;

  // Open API credentials
  private omadacId: string;
  private clientId: string;
  private clientSecret: string;

  // token cache
  private accessToken?: string;
  private accessTokenExpiresAt?: number;

  constructor() {
    this.baseUrl = (process.env.OMADA_URL || '').replace(/\/$/, '');
    this.configuredSiteId = process.env.OMADA_SITE_ID || '';

    this.omadacId = process.env.OMADA_OPENAPI_OMADAC_ID || '';
    this.clientId = process.env.OMADA_OPENAPI_CLIENT_ID || '';
    this.clientSecret = process.env.OMADA_OPENAPI_CLIENT_SECRET || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    if (!this.baseUrl) logger.warn('OMADA_URL is not set');
    if (!this.omadacId) logger.warn('OMADA_OPENAPI_OMADAC_ID is not set');
    if (!this.clientId) logger.warn('OMADA_OPENAPI_CLIENT_ID is not set');
    if (!this.clientSecret) logger.warn('OMADA_OPENAPI_CLIENT_SECRET is not set');
    if (!this.configuredSiteId) logger.warn('OMADA_SITE_ID is not set (will attempt site auto-discovery)');
  }

  private configured(): boolean {
    return Boolean(this.baseUrl && this.omadacId && this.clientId && this.clientSecret);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.configured()) {
      throw new Error(
        'Omada Open API not configured. Set OMADA_URL, OMADA_OPENAPI_OMADAC_ID, OMADA_OPENAPI_CLIENT_ID, OMADA_OPENAPI_CLIENT_SECRET.'
      );
    }

    const now = Date.now();
    if (this.accessToken && this.accessTokenExpiresAt && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    // Token endpoint (client credentials)
    const resp = await this.client.post<TokenResponse>(
      '/openapi/authorize/token?grant_type=client_credentials',
      {
        omadacId: this.omadacId,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }
    );

    if (typeof resp.data === 'string') {
      throw new Error('Omada token endpoint returned HTML (wrong OMADA_URL / redirect)');
    }

    if (!resp.data || resp.data.errorCode !== 0) {
      throw new Error(`Omada token error: ${resp.data?.errorCode ?? 'unknown'} ${resp.data?.msg ?? ''}`);
    }

    const token = resp.data.result?.accessToken;
    if (!token) {
      throw new Error('Omada token response missing result.accessToken');
    }

    const expiresInSec = Number(resp.data.result?.expiresIn ?? 7200);
    this.accessToken = token;
    this.accessTokenExpiresAt = now + expiresInSec * 1000;

    logger.info('Successfully authenticated with Omada Open API');
    return token;
  }

  private async openApiRequest<T>(
    method: 'GET' | 'POST',
    pathV2: string,
    pathV1: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    const token = await this.getAccessToken();

    const headers = {
      // Required format for Omada Open API
      Authorization: `AccessToken=${token}`,
    };

    // Attempt v2 style first (common on some controller builds): /openapi/v2/... with omadacId query param
    try {
      const resp = await this.client.request<ApiResponse<T>>({
        method,
        url: pathV2,
        params: { ...(params || {}), omadacId: this.omadacId },
        data: body,
        headers,
      });

      if (typeof resp.data === 'string') throw new Error('HTML');
      if (resp.data?.errorCode === 0) return (resp.data.result ?? ({} as any)) as T;

      logger.warn(`Omada OpenAPI v2 ${method} failed (${resp.data?.errorCode} ${resp.data?.msg}); trying v1`);
    } catch (e: any) {
      logger.warn(`Omada OpenAPI v2 ${method} exception; trying v1: ${e?.message || e}`);
    }

    // v1 style: /openapi/v1/{omadacId}/...
    const resp2 = await this.client.request<ApiResponse<T>>({
      method,
      url: `/openapi/v1/${this.omadacId}${pathV1}`,
      params: params || {},
      data: body,
      headers,
    });

    if (typeof resp2.data === 'string') {
      throw new Error('Omada Open API returned HTML (misrouted/redirect)');
    }

    if (!resp2.data || resp2.data.errorCode !== 0) {
      throw new Error(`Omada Open API error: ${resp2.data?.errorCode ?? 'unknown'} ${resp2.data?.msg ?? ''}`);
    }

    return (resp2.data.result ?? ({} as any)) as T;
  }

  /**
   * List sites visible to the Open API token.
   * Used to validate OMADA_SITE_ID and to auto-select a site when not configured.
   */
  async getSites(): Promise<any[]> {
    try {
      const result: any = await this.openApiRequest<any>(
        'GET',
        `/openapi/v2/sites`,
        `/sites`,
        { page: 1, pageSize: 1000 }
      );

      const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      return rows;
    } catch (e: any) {
      logger.error(`Omada getSites error: ${e?.message || e}`);
      return [];
    }
  }

  /**
   * Resolve a usable siteId:
   * - If OMADA_SITE_ID is set and visible to the token, use it.
   * - Otherwise, pick the first visible site and log a warning.
   */
  private async resolveSiteId(): Promise<string> {
    const sites = await this.getSites();

    const normalizeSiteId = (s: any) => String(s?.siteId ?? s?.id ?? '');
    const allSiteIds = sites.map(normalizeSiteId).filter(Boolean);

    if (this.configuredSiteId) {
      if (allSiteIds.includes(this.configuredSiteId)) {
        return this.configuredSiteId;
      }

      logger.warn(
        `OMADA_SITE_ID="${this.configuredSiteId}" is not visible to this Open API token. Visible siteIds: ${allSiteIds.join(
          ', '
        )}`
      );
    }

    const first = sites?.[0];
    const fallback = normalizeSiteId(first);
    if (fallback) {
      logger.warn(`Using first visible Omada siteId="${fallback}" (auto-discovered).`);
      return fallback;
    }

    throw new Error('No Omada sites visible to Open API token. Check Open API app permissions.');
  }

  private mapDeviceStatus(status: any): 'online' | 'offline' | 'disconnected' {
    if (status === 1 || status === 'connected' || status === 'online') return 'online';
    if (status === 0 || status === 'disconnected') return 'disconnected';
    return 'offline';
  }

  async getDevices(): Promise<NetworkDevice[]> {
    const siteId = await this.resolveSiteId();

    const result: any = await this.openApiRequest<any>(
      'GET',
      `/openapi/v2/sites/${siteId}/devices`,
      `/sites/${siteId}/devices`,
      { page: 1, pageSize: 1000 }
    );

    const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
    return rows.map((d: any) => ({
      id: d.mac || d.deviceMac || d.id,
      name: d.name || d.deviceName || d.alias || d.mac,
      mac: d.mac || d.deviceMac,
      ip: d.ip || d.ipAddress,
      type: d.type || d.deviceType,
      model: d.model || d.deviceModel,
      status: this.mapDeviceStatus(d.status),
      uptime: d.uptime,
      firmwareVersion: d.firmwareVersion || d.fwVersion,
      site: siteId,
      lastSeen: d.lastSeen ? new Date(Number(d.lastSeen) * 1000) : undefined,
    }));
  }

  async getDeviceById(deviceId: string): Promise<NetworkDevice | null> {
    const devices = await this.getDevices();
    return devices.find((d) => (d.id || '').toLowerCase() === deviceId.toLowerCase()) || null;
  }

  async rebootDevice(deviceId: string): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/devices/${deviceId}/reboot`,
        `/sites/${siteId}/devices/${deviceId}/reboot`
      );

      logger.info(`Reboot initiated for device ${deviceId}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada rebootDevice error: ${e?.message || e}`);
      return false;
    }
  }

  async getClients(): Promise<NetworkClient[]> {
    const siteId = await this.resolveSiteId();

    const result: any = await this.openApiRequest<any>(
      'GET',
      `/openapi/v2/sites/${siteId}/clients`,
      `/sites/${siteId}/clients`,
      { page: 1, pageSize: 1000 }
    );

    const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
    return rows.map((c: any) => ({
      id: c.mac || c.clientMac || c.id,
      mac: c.mac || c.clientMac,
      ip: c.ip || c.ipAddress,
      name: c.name || c.nickname || c.mac,
      hostname: c.hostName || c.hostname,
      vendor: c.vendor,
      connected: Boolean(c.active ?? c.connected ?? true),
      wireless: Boolean(c.wireless),
      ssid: c.ssid,
      signalStrength: c.signalLevel ?? c.rssi,
      deviceType: c.deviceType,
      lastSeen: c.lastSeen ? new Date(Number(c.lastSeen) * 1000) : new Date(),
    }));
  }

  async blockClient(clientMac: string): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/clients/${clientMac}/block`,
        `/sites/${siteId}/clients/${clientMac}/block`
      );

      logger.info(`Blocked client ${clientMac}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada blockClient error: ${e?.message || e}`);
      return false;
    }
  }

  async unblockClient(clientMac: string): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/clients/${clientMac}/unblock`,
        `/sites/${siteId}/clients/${clientMac}/unblock`
      );

      logger.info(`Unblocked client ${clientMac}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada unblockClient error: ${e?.message || e}`);
      return false;
    }
  }

  async getSiteSettings(): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      return await this.openApiRequest<any>(
        'GET',
        `/openapi/v2/sites/${siteId}/setting`,
        `/sites/${siteId}/setting`
      );
    } catch (e: any) {
      logger.error(`Omada getSiteSettings error: ${e?.message || e}`);
      return null;
    }
  }

  async getWLANs(): Promise<any[]> {
    try {
      const siteId = await this.resolveSiteId();

      const result: any = await this.openApiRequest<any>(
        'GET',
        `/openapi/v2/sites/${siteId}/wireless-network/wlans`,
        `/sites/${siteId}/wireless-network/wlans`
      );

      const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      return rows;
    } catch (e: any) {
      logger.error(`Omada getWLANs error: ${e?.message || e}`);
      return [];
    }
  }
}

export default new OmadaService();
