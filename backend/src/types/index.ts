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
  vlan?: number;
  parentDeviceMac?: string;
  parentDeviceName?: string;
  port?: string;
  uplinkDevice?: string;
  rateLimit?: {
    download?: number;
    upload?: number;
  };
}

export interface SwitchPort {
  port: number;
  name: string;
  enabled: boolean;
  linkStatus: 'up' | 'down';
  speed: string;
  duplex: string;
  poe?: {
    enabled: boolean;
    power: number;
    mode: string;
  };
  vlan?: number;
  profile?: string;
  connectedDevice?: {
    mac: string;
    name: string;
    type: string;
  };
}

export interface APRadio {
  radioId: string;
  band: '2.4GHz' | '5GHz' | '6GHz';
  channel: number;
  channelWidth: string;
  txPower: number;
  mode: string;
  enabled: boolean;
}

export interface FirmwareInfo {
  deviceId: string;
  currentVersion: string;
  latestVersion?: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  lastChecked?: Date;
}

export interface NetworkTopology {
  devices: Array<{
    id: string;
    name: string;
    type: string;
    mac: string;
    ip: string;
    status: string;
    children: string[];
  }>;
  connections: Array<{
    from: string;
    to: string;
    port?: string;
    type: 'wired' | 'wireless';
  }>;
}

export interface BandwidthStats {
  deviceId?: string;
  clientMac?: string;
  timestamp: Date;
  download: number;
  upload: number;
  total: number;
}

export interface TrafficStats {
  current: {
    download: number;
    upload: number;
    total: number;
  };
  historical: Array<{
    timestamp: Date;
    download: number;
    upload: number;
  }>;
  topClients: Array<{
    mac: string;
    name?: string;
    download: number;
    upload: number;
    total: number;
  }>;
}

export interface WLAN {
  id: string;
  name: string;
  ssid: string;
  enabled: boolean;
  security: string;
  vlan?: number;
  guestNetwork: boolean;
  hideSsid: boolean;
  bandSteering: boolean;
  clients: number;
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  device?: string;
  message: string;
  details?: any;
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
