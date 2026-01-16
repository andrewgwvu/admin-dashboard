import api from './api';
import { User, AuditLog, SystemConfig, SystemStats, ApiResponse } from '../types';

export const adminService = {
  // User Management
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/admin/users');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get users');
  },

  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: 'admin' | 'user';
  }): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/admin/users', userData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create user');
  },

  updateUser: async (
    id: string,
    userData: {
      username?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: 'admin' | 'user';
    }
  ): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}`, userData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update user');
  },

  deleteUser: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse>(`/admin/users/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete user');
    }
  },

  // Audit Logs
  getAuditLogs: async (params?: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
  }): Promise<AuditLog[]> => {
    const response = await api.get<ApiResponse<AuditLog[]>>('/admin/audit-logs', { params });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get audit logs');
  },

  // Configuration
  getConfig: async (): Promise<SystemConfig> => {
    const response = await api.get<ApiResponse<SystemConfig>>('/admin/config');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get config');
  },

  updateConfig: async (config: any): Promise<void> => {
    const response = await api.put<ApiResponse>('/admin/config', config);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update config');
    }
  },

  // System Stats
  getSystemStats: async (): Promise<SystemStats> => {
    const response = await api.get<ApiResponse<SystemStats>>('/admin/stats');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get stats');
  },
};
