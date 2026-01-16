import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountSource {
  source: 'jumpcloud' | 'okta' | 'active-directory';
  sourceId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  enabled: boolean;
  locked: boolean;
  passwordLastSet?: Date;
  passwordExpiryDate?: Date;
  lastLogin?: Date;
  mfaEnabled: boolean;
  attributes: Record<string, any>;
}

export interface MFADevice {
  id: string;
  type: string;
  name: string;
  status: 'active' | 'inactive' | 'pending';
  enrolledAt?: Date;
  lastUsed?: Date;
  source: 'jumpcloud' | 'okta' | 'active-directory';
}

export interface UnifiedAccount {
  primarySource: 'jumpcloud' | 'okta' | 'active-directory';
  accounts: AccountSource[];
  mfaDevices: MFADevice[];
}

export interface NetworkDevice {
  id: string;
  name: string;
  mac: string;
  ip: string;
  type: string;
  model: string;
  status: 'online' | 'offline' | 'disconnected';
  uptime?: number;
  firmwareVersion?: string;
  site: string;
  lastSeen?: Date;
}

export interface NetworkClient {
  id: string;
  mac: string;
  ip: string;
  name?: string;
  hostname?: string;
  vendor?: string;
  connected: boolean;
  wireless: boolean;
  ssid?: string;
  signalStrength?: number;
  deviceType?: string;
  lastSeen: Date;
}

export interface SearchResult {
  source: 'jumpcloud' | 'okta' | 'active-directory';
  type: 'user' | 'group';
  id: string;
  displayName: string;
  email?: string;
  username?: string;
  attributes: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
