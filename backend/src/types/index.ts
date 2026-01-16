import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
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

/**
 * A single person-level search hit that may include matches from multiple sources.
 *
 * `key` is a stable identifier used by the frontend to open a unified account view.
 * We prefer username when available, otherwise email, otherwise a source-specific id.
 */
export interface AggregatedSearchResult {
  key: string;
  displayName: string;
  email?: string;
  username?: string;
  matches: SearchResult[];
  sources: Array<'jumpcloud' | 'okta' | 'active-directory'>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
