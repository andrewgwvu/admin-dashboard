import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { NetworkDevice, NetworkClient } from '../types';
import logger from '../config/logger';

class OmadaService {
  private client: AxiosInstance;
  private baseUrl: string;
  private username: string;
  private password: string;
  private siteId: string;
  private token: string | null = null;
  private omadacId: string | null = null;

  constructor() {
    this.baseUrl = process.env.OMADA_URL || '';
    this.username = process.env.OMADA_USERNAME || '';
    this.password = process.env.OMADA_PASSWORD || '';
    this.siteId = process.env.OMADA_SITE_ID || '';

    // Create axios instance with SSL verification disabled for self-signed certs
    this.client = axios.create({
      baseURL: this.baseUrl,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async authenticate(): Promise<void> {
    try {
      // Step 1: Get controller ID
      const infoResponse = await this.client.get('/api/info');
      this.omadacId = infoResponse.data.result.omadacId;

      // Step 2: Login
      const loginResponse = await this.client.post(`/${this.omadacId}/api/v2/login`, {
        username: this.username,
        password: this.password,
      });

      this.token = loginResponse.data.result.token;

      // Set token in headers for subsequent requests
      this.client.defaults.headers.common['Csrf-Token'] = this.token;

      logger.info('Successfully authenticated with Omada Controller');
    } catch (error) {
      logger.error('Omada authentication error:', error);
      throw new Error('Failed to authenticate with Omada Controller');
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      await this.authenticate();
    }
  }

  async getDevices(): Promise<NetworkDevice[]> {
    try {
      await this.ensureAuthenticated();

      const response = await this.client.get(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/devices`
      );

      const devices: NetworkDevice[] = response.data.result.data.map((device: any) => ({
        id: device.mac,
        name: device.name,
        mac: device.mac,
        ip: device.ip,
        type: device.type,
        model: device.model,
        status: this.mapDeviceStatus(device.status),
        uptime: device.uptime,
        firmwareVersion: device.firmwareVersion,
        site: this.siteId,
        lastSeen: device.lastSeen ? new Date(device.lastSeen * 1000) : undefined,
      }));

      return devices;
    } catch (error) {
      logger.error('Omada getDevices error:', error);
      // Try to re-authenticate if token expired
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.token = null;
        return this.getDevices();
      }
      throw new Error('Failed to fetch network devices');
    }
  }

  async getClients(): Promise<NetworkClient[]> {
    try {
      await this.ensureAuthenticated();

      const response = await this.client.get(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/clients`
      );

      const clients: NetworkClient[] = response.data.result.data.map((client: any) => ({
        id: client.mac,
        mac: client.mac,
        ip: client.ip,
        name: client.name,
        hostname: client.hostName,
        vendor: client.vendor,
        connected: client.active,
        wireless: client.wireless,
        ssid: client.ssid,
        signalStrength: client.signalLevel,
        deviceType: client.deviceType,
        lastSeen: new Date(client.lastSeen * 1000),
      }));

      return clients;
    } catch (error) {
      logger.error('Omada getClients error:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.token = null;
        return this.getClients();
      }
      throw new Error('Failed to fetch network clients');
    }
  }

  async getDeviceById(deviceId: string): Promise<NetworkDevice | null> {
    try {
      await this.ensureAuthenticated();

      const response = await this.client.get(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/devices/${deviceId}`
      );

      const device = response.data.result;

      return {
        id: device.mac,
        name: device.name,
        mac: device.mac,
        ip: device.ip,
        type: device.type,
        model: device.model,
        status: this.mapDeviceStatus(device.status),
        uptime: device.uptime,
        firmwareVersion: device.firmwareVersion,
        site: this.siteId,
        lastSeen: device.lastSeen ? new Date(device.lastSeen * 1000) : undefined,
      };
    } catch (error) {
      logger.error('Omada getDeviceById error:', error);
      return null;
    }
  }

  async rebootDevice(deviceId: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();

      await this.client.post(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/devices/${deviceId}/reboot`
      );

      logger.info(`Rebooted device ${deviceId}`);
      return true;
    } catch (error) {
      logger.error('Omada rebootDevice error:', error);
      return false;
    }
  }

  async blockClient(clientMac: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();

      await this.client.post(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/clients/${clientMac}/block`
      );

      logger.info(`Blocked client ${clientMac}`);
      return true;
    } catch (error) {
      logger.error('Omada blockClient error:', error);
      return false;
    }
  }

  async unblockClient(clientMac: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();

      await this.client.post(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/clients/${clientMac}/unblock`
      );

      logger.info(`Unblocked client ${clientMac}`);
      return true;
    } catch (error) {
      logger.error('Omada unblockClient error:', error);
      return false;
    }
  }

  async getSiteSettings(): Promise<any> {
    try {
      await this.ensureAuthenticated();

      const response = await this.client.get(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/setting`
      );

      return response.data.result;
    } catch (error) {
      logger.error('Omada getSiteSettings error:', error);
      return null;
    }
  }

  async getWLANs(): Promise<any[]> {
    try {
      await this.ensureAuthenticated();

      const response = await this.client.get(
        `/${this.omadacId}/api/v2/sites/${this.siteId}/setting/wlans`
      );

      return response.data.result.data || [];
    } catch (error) {
      logger.error('Omada getWLANs error:', error);
      return [];
    }
  }

  private mapDeviceStatus(status: number): 'online' | 'offline' | 'disconnected' {
    // Status codes from TP-Link Omada API
    // 0 = disconnected, 1 = connected/online, 10 = pending, etc.
    switch (status) {
      case 1:
        return 'online';
      case 0:
        return 'disconnected';
      default:
        return 'offline';
    }
  }

  async logout(): Promise<void> {
    if (this.token && this.omadacId) {
      try {
        await this.client.post(`/${this.omadacId}/api/v2/logout`);
        this.token = null;
        logger.info('Logged out from Omada Controller');
      } catch (error) {
        logger.error('Omada logout error:', error);
      }
    }
  }
}

export default new OmadaService();
