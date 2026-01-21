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

  // Web API credentials
  private webApiUsername: string;
  private webApiPassword: string;

  // token cache (OpenAPI)
  private accessToken?: string;
  private accessTokenExpiresAt?: number;

  // Web API session cache
  private controllerId?: string;
  private webApiToken?: string;
  private csrfToken?: string;

  constructor() {
    this.baseUrl = (process.env.OMADA_URL || '').replace(/\/$/, '');
    this.configuredSiteId = process.env.OMADA_SITE_ID || '';

    this.omadacId = process.env.OMADA_OPENAPI_OMADAC_ID || '';
    this.clientId = process.env.OMADA_OPENAPI_CLIENT_ID || '';
    this.clientSecret = process.env.OMADA_OPENAPI_CLIENT_SECRET || '';

    this.webApiUsername = process.env.OMADA_USERNAME || '';
    this.webApiPassword = process.env.OMADA_PASSWORD || '';

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
      withCredentials: true, // Enable cookie support for WebAPI sessions
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

  // ========== Web API Methods (for features not in OpenAPI) ==========

  /**
   * Get controller ID for Web API requests
   */
  private async getControllerId(): Promise<string> {
    if (this.controllerId) {
      return this.controllerId;
    }

    const resp = await this.client.get<ApiResponse<any>>('/api/info');

    if (typeof resp.data === 'string') {
      throw new Error('Omada /api/info returned HTML');
    }

    if (!resp.data || resp.data.errorCode !== 0) {
      throw new Error(`Omada /api/info error: ${resp.data?.errorCode ?? 'unknown'} ${resp.data?.msg ?? ''}`);
    }

    const omadacId = resp.data.result?.omadacId;
    if (!omadacId) {
      throw new Error('Omada /api/info response missing result.omadacId');
    }

    this.controllerId = omadacId;
    logger.info(`Discovered controller ID: ${omadacId}`);
    return omadacId;
  }

  /**
   * Login to Web API using username/password
   */
  private async webApiLogin(): Promise<{ token: string; csrfToken: string }> {
    if (!this.webApiUsername || !this.webApiPassword) {
      throw new Error('Web API credentials not configured. Set OMADA_USERNAME and OMADA_PASSWORD.');
    }

    // Get controller ID first
    const controllerId = await this.getControllerId();

    const resp = await this.client.post<ApiResponse<any>>(
      `/${controllerId}/api/v2/login`,
      {
        username: this.webApiUsername,
        password: this.webApiPassword,
      }
    );

    if (typeof resp.data === 'string') {
      throw new Error('Omada Web API login returned HTML');
    }

    if (!resp.data || resp.data.errorCode !== 0) {
      throw new Error(`Omada Web API login error: ${resp.data?.errorCode ?? 'unknown'} ${resp.data?.msg ?? ''}`);
    }

    const token = resp.data.result?.token;
    if (!token) {
      throw new Error('Omada Web API login response missing result.token');
    }

    // Extract CSRF token from response
    const csrfToken = token;

    this.webApiToken = token;
    this.csrfToken = csrfToken;

    logger.info('Successfully authenticated with Omada Web API');
    return { token, csrfToken };
  }

  /**
   * Make an authenticated Web API request
   */
  private async webApiRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    // Ensure we have a valid session
    if (!this.webApiToken || !this.csrfToken) {
      await this.webApiLogin();
    }

    const controllerId = await this.getControllerId();

    // Web API uses cookie-based sessions - send token as Cookie header
    const headers: Record<string, string> = {
      'Csrf-Token': this.csrfToken!,
      'Cookie': `${controllerId}=${this.webApiToken!}`,
    };

    try {
      const fullUrl = `/${controllerId}${path}`;
      const tokenPreview = this.webApiToken?.substring(0, 10);
      logger.info(`WebAPI ${method} ${fullUrl} with Cookie: ${controllerId}=${tokenPreview}... (CSRF: ${this.csrfToken?.substring(0, 10)}...)`);

      const resp = await this.client.request<ApiResponse<T> | string>({
        method,
        url: fullUrl,
        params: params || {},
        data: body,
        headers,
        validateStatus: (s) => s >= 200 && s < 300, // Only accept 2xx, reject 302 redirects
      });

      if (typeof resp.data === 'string') {
        const preview = (resp.data as string).substring(0, 200);
        logger.error(`Web API returned HTML instead of JSON for ${method} ${fullUrl}: ${preview}...`);
        throw new Error(`Omada Web API returned HTML (${resp.status}): ${preview.substring(0, 100)}`);
      }

      if (!resp.data || resp.data.errorCode !== 0) {
        // If unauthorized, try re-logging in
        if (resp.data?.errorCode === -1010 || resp.data?.errorCode === -1001) {
          logger.warn('Web API session expired, re-authenticating...');
          this.webApiToken = undefined;
          this.csrfToken = undefined;
          await this.webApiLogin();

          // Retry the request with new token as cookie
          const retryResp = await this.client.request<ApiResponse<T> | string>({
            method,
            url: `/${controllerId}${path}`,
            params: params || {},
            data: body,
            headers: {
              'Csrf-Token': this.csrfToken!,
              'Cookie': `${controllerId}=${this.webApiToken!}`,
            },
            validateStatus: (s) => s >= 200 && s < 300,
          });

          if (typeof retryResp.data === 'string') {
            throw new Error('Omada Web API returned HTML after retry');
          }

          if (!retryResp.data || retryResp.data.errorCode !== 0) {
            throw new Error(`Omada Web API error: ${retryResp.data?.errorCode ?? 'unknown'} ${retryResp.data?.msg ?? ''}`);
          }

          return (retryResp.data.result ?? ({} as any)) as T;
        }

        throw new Error(`Omada Web API error: ${resp.data?.errorCode ?? 'unknown'} ${resp.data?.msg ?? ''}`);
      }

      return (resp.data.result ?? ({} as any)) as T;
    } catch (e: any) {
      // If network error or session issue, clear cache
      if (e.response?.status === 401 || e.response?.status === 403 || e.response?.status === 302) {
        logger.warn(`Web API authentication failed (${e.response?.status}), clearing session cache`);
        this.webApiToken = undefined;
        this.csrfToken = undefined;
      }
      throw e;
    }
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
      vlan: c.vid || c.vlan,
      parentDeviceMac: c.apMac || c.switchMac || c.gatewayMac || c.uplinkDeviceMac,
      port: c.port,
      uplinkDevice: c.connectDevType,
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

  async getAlerts(page = 1, pageSize = 100): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for alerts (not available in OpenAPI v1)
      const result: any = await this.webApiRequest<any>(
        'GET',
        `/api/v2/sites/${siteId}/alerts`,
        { page, pageSize }
      );

      return {
        data: Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [],
        totalRows: result?.totalRows || 0,
        currentPage: result?.currentPage || page,
        currentSize: result?.currentSize || pageSize,
      };
    } catch (e: any) {
      logger.error(`Omada getAlerts error: ${e?.message || e}`);
      return { data: [], totalRows: 0, currentPage: page, currentSize: pageSize };
    }
  }

  async getEvents(page = 1, pageSize = 100): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for events (not available in OpenAPI v1)
      const result: any = await this.webApiRequest<any>(
        'GET',
        `/api/v2/sites/${siteId}/events`,
        { page, pageSize }
      );

      return {
        data: Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [],
        totalRows: result?.totalRows || 0,
        currentPage: result?.currentPage || page,
        currentSize: result?.currentSize || pageSize,
      };
    } catch (e: any) {
      logger.error(`Omada getEvents error: ${e?.message || e}`);
      return { data: [], totalRows: 0, currentPage: page, currentSize: pageSize };
    }
  }

  async getWANStatus(): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      // Try to get gateway/router devices first
      const devices = await this.getDevices();
      const gateways = devices.filter((d) => d.type === 'gateway' || d.type === 'router');

      if (gateways.length === 0) {
        return {
          status: 'unknown',
          message: 'No gateway/router devices found',
        };
      }

      // Get detailed info about the first gateway
      const gateway = gateways[0];

      // Try to get WAN port status
      const result: any = await this.openApiRequest<any>(
        'GET',
        `/openapi/v2/sites/${siteId}/gateways/${gateway.id}/wan-ports`,
        `/sites/${siteId}/gateways/${gateway.id}/wan-ports`
      ).catch(() => null);

      if (!result) {
        return {
          status: gateway.status,
          message: `Gateway ${gateway.name} is ${gateway.status}`,
          gateway: {
            id: gateway.id,
            name: gateway.name,
            ip: gateway.ip,
            mac: gateway.mac,
            status: gateway.status,
          },
        };
      }

      const wanPorts = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

      return {
        status: gateway.status,
        gateway: {
          id: gateway.id,
          name: gateway.name,
          ip: gateway.ip,
          mac: gateway.mac,
          status: gateway.status,
        },
        wanPorts: wanPorts.map((port: any) => ({
          name: port.name || port.portName,
          status: port.status || port.linkStatus,
          ipAddress: port.ipAddress || port.ip,
          gateway: port.gateway,
          dns: port.dns,
          uptime: port.uptime,
        })),
      };
    } catch (e: any) {
      logger.error(`Omada getWANStatus error: ${e?.message || e}`);
      return {
        status: 'error',
        message: e?.message || 'Failed to get WAN status',
      };
    }
  }

  // ========== Firmware Management ==========
  async getFirmwareInfo(deviceId: string): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      const result: any = await this.openApiRequest<any>(
        'GET',
        `/openapi/v2/sites/${siteId}/devices/${deviceId}/firmware`,
        `/sites/${siteId}/devices/${deviceId}/firmware`
      );

      return {
        deviceId,
        currentVersion: result?.currentVersion || result?.fwVersion,
        latestVersion: result?.latestVersion || result?.newVersion,
        updateAvailable: Boolean(result?.updateAvailable || result?.needUpgrade),
        releaseNotes: result?.releaseNotes || result?.description,
        lastChecked: new Date(),
      };
    } catch (e: any) {
      logger.error(`Omada getFirmwareInfo error: ${e?.message || e}`);
      return null;
    }
  }

  async upgradeFirmware(deviceId: string): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/devices/${deviceId}/firmware/upgrade`,
        `/sites/${siteId}/devices/${deviceId}/firmware/upgrade`
      );

      logger.info(`Firmware upgrade initiated for device ${deviceId}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada upgradeFirmware error: ${e?.message || e}`);
      return false;
    }
  }

  // ========== Switch Port Management ==========
  async getSwitchPorts(switchId: string): Promise<any[]> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for switch ports (not available in OpenAPI v1)
      const result: any = await this.webApiRequest<any>(
        'GET',
        `/api/v2/sites/${siteId}/switches/${switchId}/ports`
      );

      const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      return rows.map((port: any) => ({
        port: port.port || port.portId || port.id,
        name: port.name || port.portName || `Port ${port.port}`,
        enabled: Boolean(port.enable ?? port.enabled ?? true),
        linkStatus: port.linkStatus === 'link-up' || port.linkStatus === 1 ? 'up' : 'down',
        speed: port.speed || port.linkSpeed,
        duplex: port.duplex || 'auto',
        poe: port.poe ? {
          enabled: Boolean(port.poe.enable),
          power: port.poe.power || 0,
          mode: port.poe.mode || 'auto',
        } : undefined,
        vlan: port.vlan || port.pvid,
        profile: port.profile || port.profileName,
        connectedDevice: port.client ? {
          mac: port.client.mac,
          name: port.client.name,
          type: port.client.type,
        } : undefined,
      }));
    } catch (e: any) {
      logger.error(`Omada getSwitchPorts error: ${e?.message || e}`);
      return [];
    }
  }

  async updateSwitchPort(switchId: string, portId: string | number, config: any): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for switch port control (not available in OpenAPI v1)
      await this.webApiRequest<any>(
        'PATCH',
        `/api/v2/sites/${siteId}/switches/${switchId}/ports/${portId}`,
        {},
        config
      );

      logger.info(`Updated switch ${switchId} port ${portId}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada updateSwitchPort error: ${e?.message || e}`);
      return false;
    }
  }

  async toggleSwitchPortPoe(switchId: string, portId: string | number, enabled: boolean): Promise<boolean> {
    try {
      return await this.updateSwitchPort(switchId, portId, { poe: { enable: enabled } });
    } catch (e: any) {
      logger.error(`Omada toggleSwitchPortPoe error: ${e?.message || e}`);
      return false;
    }
  }

  // ========== AP Radio Management ==========
  async getAPRadios(apId: string): Promise<any[]> {
    try {
      const siteId = await this.resolveSiteId();

      const result: any = await this.openApiRequest<any>(
        'GET',
        `/openapi/v2/sites/${siteId}/aps/${apId}/radios`,
        `/sites/${siteId}/aps/${apId}/radios`
      );

      const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      return rows.map((radio: any) => ({
        radioId: radio.radioId || radio.id,
        band: radio.band || radio.radioName,
        channel: radio.channel,
        channelWidth: radio.channelWidth || radio.bandwidth,
        txPower: radio.txPower || radio.power,
        mode: radio.mode || radio.radioMode,
        enabled: Boolean(radio.enable ?? radio.enabled ?? true),
      }));
    } catch (e: any) {
      logger.error(`Omada getAPRadios error: ${e?.message || e}`);
      return [];
    }
  }

  async updateAPRadio(apId: string, radioId: string, config: any): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/aps/${apId}/radios/${radioId}`,
        `/sites/${siteId}/aps/${apId}/radios/${radioId}`,
        {},
        config
      );

      logger.info(`Updated AP ${apId} radio ${radioId}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada updateAPRadio error: ${e?.message || e}`);
      return false;
    }
  }

  // ========== WLAN Management ==========
  async updateWLAN(wlanId: string, config: any): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/wireless-network/wlans/${wlanId}`,
        `/sites/${siteId}/wireless-network/wlans/${wlanId}`,
        {},
        config
      );

      logger.info(`Updated WLAN ${wlanId}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada updateWLAN error: ${e?.message || e}`);
      return false;
    }
  }

  async toggleWLAN(wlanId: string, enabled: boolean): Promise<boolean> {
    try {
      return await this.updateWLAN(wlanId, { enable: enabled });
    } catch (e: any) {
      logger.error(`Omada toggleWLAN error: ${e?.message || e}`);
      return false;
    }
  }

  // ========== WAN Connection Control ==========
  async connectWAN(gatewayId: string, wanId: string): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/gateways/${gatewayId}/wan/${wanId}/connect`,
        `/sites/${siteId}/gateways/${gatewayId}/wan/${wanId}/connect`
      );

      logger.info(`Connected WAN ${wanId} on gateway ${gatewayId}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada connectWAN error: ${e?.message || e}`);
      return false;
    }
  }

  async disconnectWAN(gatewayId: string, wanId: string): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/gateways/${gatewayId}/wan/${wanId}/disconnect`,
        `/sites/${siteId}/gateways/${gatewayId}/wan/${wanId}/disconnect`
      );

      logger.info(`Disconnected WAN ${wanId} on gateway ${gatewayId}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada disconnectWAN error: ${e?.message || e}`);
      return false;
    }
  }

  // ========== Client Rate Limiting ==========
  async setClientRateLimit(clientMac: string, downloadLimit: number, uploadLimit: number): Promise<boolean> {
    try {
      const siteId = await this.resolveSiteId();

      await this.openApiRequest<any>(
        'POST',
        `/openapi/v2/sites/${siteId}/clients/${clientMac}/rate-limit`,
        `/sites/${siteId}/clients/${clientMac}/rate-limit`,
        {},
        {
          download: downloadLimit,
          upload: uploadLimit,
        }
      );

      logger.info(`Set rate limit for client ${clientMac}`);
      return true;
    } catch (e: any) {
      logger.error(`Omada setClientRateLimit error: ${e?.message || e}`);
      return false;
    }
  }

  // ========== Bandwidth & Traffic Statistics ==========
  async getTrafficStats(): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for traffic stats (not available in OpenAPI v1)
      const result: any = await this.webApiRequest<any>(
        'GET',
        `/api/v2/sites/${siteId}/statistics/traffic`,
        { period: '1h' }
      );

      return {
        current: {
          download: result?.current?.rx || 0,
          upload: result?.current?.tx || 0,
          total: (result?.current?.rx || 0) + (result?.current?.tx || 0),
        },
        historical: Array.isArray(result?.historical) ? result.historical.map((h: any) => ({
          timestamp: new Date(h.time * 1000),
          download: h.rx || 0,
          upload: h.tx || 0,
        })) : [],
      };
    } catch (e: any) {
      logger.error(`Omada getTrafficStats error: ${e?.message || e}`);
      return { current: { download: 0, upload: 0, total: 0 }, historical: [] };
    }
  }

  async getClientTraffic(clientMac: string): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for client traffic (not available in OpenAPI v1)
      const result: any = await this.webApiRequest<any>(
        'GET',
        `/api/v2/sites/${siteId}/clients/${clientMac}/traffic`
      );

      return {
        download: result?.rx || result?.download || 0,
        upload: result?.tx || result?.upload || 0,
        total: (result?.rx || result?.download || 0) + (result?.tx || result?.upload || 0),
      };
    } catch (e: any) {
      logger.error(`Omada getClientTraffic error: ${e?.message || e}`);
      return { download: 0, upload: 0, total: 0 };
    }
  }

  async getTopClients(limit = 10): Promise<any[]> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for top clients stats (not available in OpenAPI v1)
      const result: any = await this.webApiRequest<any>(
        'GET',
        `/api/v2/sites/${siteId}/statistics/top-clients`,
        { limit }
      );

      const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      return rows.map((c: any) => ({
        mac: c.mac,
        name: c.name,
        download: c.rx || c.download || 0,
        upload: c.tx || c.upload || 0,
        total: (c.rx || c.download || 0) + (c.tx || c.upload || 0),
      }));
    } catch (e: any) {
      logger.error(`Omada getTopClients error: ${e?.message || e}`);
      return [];
    }
  }

  // ========== Network Topology ==========
  async getNetworkTopology(): Promise<any> {
    try {
      const devices = await this.getDevices();
      const clients = await this.getClients();

      // Build device hierarchy
      const connections: any[] = [];
      const deviceNodes = devices.map(d => ({
        id: d.mac,
        name: d.name,
        type: d.type,
        mac: d.mac,
        ip: d.ip,
        status: d.status,
        children: [] as string[],
      }));

      // Find connections from clients to devices
      clients.forEach(client => {
        if (client.parentDeviceMac) {
          connections.push({
            from: client.parentDeviceMac,
            to: client.mac,
            port: client.port,
            type: client.wireless ? 'wireless' : 'wired',
          });

          const parentDevice = deviceNodes.find(d => d.mac === client.parentDeviceMac);
          if (parentDevice) {
            parentDevice.children.push(client.mac);
          }
        }
      });

      return {
        devices: deviceNodes,
        connections,
        clients: clients.map(c => ({
          mac: c.mac,
          name: c.name,
          ip: c.ip,
          type: c.wireless ? 'wireless' : 'wired',
        })),
      };
    } catch (e: any) {
      logger.error(`Omada getNetworkTopology error: ${e?.message || e}`);
      return { devices: [], connections: [], clients: [] };
    }
  }

  // ========== System Logs ==========
  async getSystemLogs(page = 1, pageSize = 100): Promise<any> {
    try {
      const siteId = await this.resolveSiteId();

      // Use Web API for system logs (not available in OpenAPI v1)
      const result: any = await this.webApiRequest<any>(
        'GET',
        `/api/v2/sites/${siteId}/logs`,
        { page, pageSize }
      );

      return {
        data: Array.isArray(result?.data) ? result.data.map((log: any) => ({
          id: log.id || log._id,
          timestamp: log.time ? new Date(log.time * 1000) : new Date(),
          level: log.level || log.logLevel || 'info',
          category: log.category || log.module || 'system',
          device: log.device || log.deviceName,
          message: log.message || log.msg || log.description,
          details: log.details,
        })) : [],
        totalRows: result?.totalRows || 0,
        currentPage: result?.currentPage || page,
        currentSize: result?.currentSize || pageSize,
      };
    } catch (e: any) {
      logger.error(`Omada getSystemLogs error: ${e?.message || e}`);
      return { data: [], totalRows: 0, currentPage: page, currentSize: pageSize };
    }
  }
}

export default new OmadaService();
