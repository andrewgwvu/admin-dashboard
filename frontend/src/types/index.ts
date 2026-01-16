export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
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
  passwordLastSet?: string;
  passwordExpiryDate?: string;
  lastLogin?: string;
  mfaEnabled: boolean;
  attributes: Record<string, any>;
}

export interface MFADevice {
  id: string;
  type: string;
  name: string;
  status: 'active' | 'inactive' | 'pending';
  enrolledAt?: string;
  lastUsed?: string;
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
  lastSeen?: string;
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
  lastSeen: string;
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

export interface AggregatedSearchResult {
  /**
   * Stable key used to open a unified account view.
   * Format mirrors backend: u:<username> | e:<email> | i:<source>:<id>
   */
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

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: any;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemConfig {
  integrations: {
    jumpcloud: {
      enabled: boolean;
      orgId: string | null;
    };
    okta: {
      enabled: boolean;
      domain: string | null;
    };
    activeDirectory: {
      enabled: boolean;
      url: string | null;
      baseDn: string | null;
    };
    omada: {
      enabled: boolean;
      url: string | null;
      siteId: string | null;
    };
  };
  database: {
    host: string;
    port: number;
    name: string;
  };
  redis: {
    host: string;
    port: number;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
}

export interface SystemStats {
  users: {
    total: number;
    admins: number;
    recentLogins: number;
  };
  auditLogs: {
    total: number;
  };
}
