import api from './api';
import { ApiResponse, NetworkDevice, NetworkClient } from '../types';

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
};
