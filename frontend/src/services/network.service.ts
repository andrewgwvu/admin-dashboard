import api from './api';
import { ApiResponse, NetworkDevice, NetworkClient, FirmwareInfo, SwitchPort, APRadio, TrafficStats, NetworkTopology, SystemLog, WLAN } from '../types';

export const networkService = {
  async getDevices(): Promise<NetworkDevice[]> {
    const response = await api.get<ApiResponse<NetworkDevice[]>>('/network/devices');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch devices');
  },

  async getDeviceById(deviceId: string): Promise<NetworkDevice> {
    const response = await api.get<ApiResponse<NetworkDevice>>(
      `/network/devices/${deviceId}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch device');
  },

  async rebootDevice(deviceId: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/devices/${deviceId}/reboot`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to reboot device');
    }
  },

  async getClients(): Promise<NetworkClient[]> {
    const response = await api.get<ApiResponse<NetworkClient[]>>('/network/clients');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch clients');
  },

  async blockClient(clientMac: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/clients/${clientMac}/block`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to block client');
    }
  },

  async unblockClient(clientMac: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/clients/${clientMac}/unblock`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to unblock client');
    }
  },

  async getSiteSettings(): Promise<any> {
    const response = await api.get<ApiResponse>('/network/settings');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch settings');
  },

  async getWLANs(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/network/wlans');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch WLANs');
  },

  async getAlerts(page = 1, pageSize = 100): Promise<any> {
    const response = await api.get<ApiResponse<any>>(
      `/network/alerts?page=${page}&pageSize=${pageSize}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch alerts');
  },

  async getEvents(page = 1, pageSize = 100): Promise<any> {
    const response = await api.get<ApiResponse<any>>(
      `/network/events?page=${page}&pageSize=${pageSize}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch events');
  },

  async getWANStatus(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/network/wan-status');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch WAN status');
  },

  async lookupMacVendor(mac: string): Promise<{ mac: string; vendor: string }> {
    const response = await api.get<ApiResponse<{ mac: string; vendor: string }>>(
      `/network/mac-lookup/${encodeURIComponent(mac)}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to lookup MAC vendor');
  },

  // ========== Firmware Management ==========
  async getFirmwareInfo(deviceId: string): Promise<FirmwareInfo> {
    const response = await api.get<ApiResponse<FirmwareInfo>>(
      `/network/devices/${deviceId}/firmware`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch firmware info');
  },

  async upgradeFirmware(deviceId: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/devices/${deviceId}/firmware/upgrade`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to upgrade firmware');
    }
  },

  // ========== Switch Port Management ==========
  async getSwitchPorts(switchId: string): Promise<SwitchPort[]> {
    const response = await api.get<ApiResponse<SwitchPort[]>>(
      `/network/switches/${switchId}/ports`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch switch ports');
  },

  async updateSwitchPort(switchId: string, portId: number, config: any): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/switches/${switchId}/ports/${portId}`,
      config
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update switch port');
    }
  },

  async toggleSwitchPortPoe(switchId: string, portId: number, enabled: boolean): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/switches/${switchId}/ports/${portId}/poe`,
      { enabled }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to toggle PoE');
    }
  },

  // ========== AP Radio Management ==========
  async getAPRadios(apId: string): Promise<APRadio[]> {
    const response = await api.get<ApiResponse<APRadio[]>>(
      `/network/aps/${apId}/radios`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch AP radios');
  },

  async updateAPRadio(apId: string, radioId: string, config: any): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/aps/${apId}/radios/${radioId}`,
      config
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update AP radio');
    }
  },

  // ========== WLAN Management ==========
  async updateWLAN(wlanId: string, config: any): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/wlans/${wlanId}`,
      config
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update WLAN');
    }
  },

  async toggleWLAN(wlanId: string, enabled: boolean): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/wlans/${wlanId}/toggle`,
      { enabled }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to toggle WLAN');
    }
  },

  // ========== WAN Connection Control ==========
  async connectWAN(gatewayId: string, wanId: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/gateways/${gatewayId}/wan/${wanId}/connect`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to connect WAN');
    }
  },

  async disconnectWAN(gatewayId: string, wanId: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/gateways/${gatewayId}/wan/${wanId}/disconnect`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect WAN');
    }
  },

  // ========== Client Rate Limiting ==========
  async setClientRateLimit(clientMac: string, download: number, upload: number): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/network/clients/${clientMac}/rate-limit`,
      { download, upload }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to set rate limit');
    }
  },

  // ========== Traffic & Bandwidth Statistics ==========
  async getTrafficStats(): Promise<TrafficStats> {
    const response = await api.get<ApiResponse<TrafficStats>>('/network/traffic-stats');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch traffic stats');
  },

  async getClientTraffic(clientMac: string): Promise<{ download: number; upload: number; total: number }> {
    const response = await api.get<ApiResponse<{ download: number; upload: number; total: number }>>(
      `/network/clients/${clientMac}/traffic`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch client traffic');
  },

  async getTopClients(limit = 10): Promise<Array<{ mac: string; name?: string; download: number; upload: number; total: number }>> {
    const response = await api.get<ApiResponse<Array<any>>>(
      `/network/top-clients?limit=${limit}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch top clients');
  },

  // ========== Network Topology ==========
  async getNetworkTopology(): Promise<NetworkTopology> {
    const response = await api.get<ApiResponse<NetworkTopology>>('/network/topology');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch network topology');
  },

  // ========== System Logs ==========
  async getSystemLogs(page = 1, pageSize = 100): Promise<{ data: SystemLog[]; totalRows: number; currentPage: number; currentSize: number }> {
    const response = await api.get<ApiResponse<any>>(
      `/network/logs?page=${page}&pageSize=${pageSize}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch system logs');
  },
};
