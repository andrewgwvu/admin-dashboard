import axios, { AxiosInstance } from 'axios';
import { AccountSource, MFADevice, SearchResult } from '../types';
import logger from '../config/logger';

class JumpCloudService {
  private client: AxiosInstance;
  private apiKey: string;
  private orgId?: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.JUMPCLOUD_API_KEY || '';
    this.orgId = process.env.JUMPCLOUD_ORG_ID || undefined;

    // Allow overriding the API base URL for EU tenants or testing.
    // Default is the US console API.
    this.baseUrl = process.env.JUMPCLOUD_BASE_URL || 'https://console.jumpcloud.com';

    if (!this.apiKey) {
      logger.warn('JUMPCLOUD_API_KEY is not set; JumpCloud integration will fail');
    }

    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Some JumpCloud orgs require x-org-id for API calls.
    if (this.orgId) {
      headers['x-org-id'] = this.orgId;
    }

    this.client = axios.create({
      baseURL: `${this.baseUrl.replace(/\/$/, '')}/api`,
      headers,
      timeout: 15000,
    });
  }

  async searchUsers(query: string): Promise<SearchResult[]> {
    try {
      const trimmed = (query || '').trim();
      if (!trimmed) return [];

      // JumpCloud's Search API supports `searchFilter` for partial text matching
      // across supported fields.
      const response = await this.client.post('/search/systemusers', {
        searchFilter: {
          searchTerm: trimmed,
          fields: ['email', 'username', 'firstname', 'lastname', 'displayname'],
        },
        // Space-separated string of fields is supported by the Search API.
        fields:
          'username email firstname lastname displayname activated account_locked password_date password_expiration_date mfa',
        limit: 50,
        skip: 0,
      });

      const resultsArray = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data)
          ? response.data
          : [];

      return resultsArray.map((user: any) => ({
        source: 'jumpcloud' as const,
        type: 'user' as const,
        id: user._id,
        displayName: user.displayname || `${user.firstname} ${user.lastname}`,
        email: user.email,
        username: user.username,
        attributes: user,
      }));
    } catch (error) {
      // Provide more actionable details for common 4xx errors.
      if (axios.isAxiosError(error)) {
        logger.error('JumpCloud search error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      } else {
        logger.error('JumpCloud search error:', error);
      }
      throw new Error('Failed to search JumpCloud users');
    }
  }

  async getUserById(userId: string): Promise<AccountSource | null> {
    try {
      const response = await this.client.get(`/systemusers/${userId}`);
      const user = response.data;

      return {
        source: 'jumpcloud',
        sourceId: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        displayName: user.displayname || `${user.firstname} ${user.lastname}`,
        enabled: user.activated,
        locked: user.account_locked || false,
        passwordLastSet: user.password_date ? new Date(user.password_date) : undefined,
        passwordExpiryDate: user.password_expiration_date ? new Date(user.password_expiration_date) : undefined,
        mfaEnabled: user.mfa?.configured || false,
        attributes: user,
      };
    } catch (error) {
      logger.error('JumpCloud getUserById error:', error);
      return null;
    }
  }

  async getMFADevices(userId: string): Promise<MFADevice[]> {
    try {
      const response = await this.client.get(`/systemusers/${userId}`);
      const user = response.data;

      if (!user.mfa?.configured) {
        return [];
      }

      const devices: MFADevice[] = [];

      if (user.totp_enabled) {
        devices.push({
          id: `${userId}-totp`,
          type: 'TOTP',
          name: 'Authenticator App',
          status: 'active',
          source: 'jumpcloud',
        });
      }

      return devices;
    } catch (error) {
      logger.error('JumpCloud getMFADevices error:', error);
      return [];
    }
  }

  async resetMFA(userId: string): Promise<boolean> {
    try {
      await this.client.post(`/systemusers/${userId}/resetmfa`);
      logger.info(`MFA reset for JumpCloud user ${userId}`);
      return true;
    } catch (error) {
      logger.error('JumpCloud resetMFA error:', error);
      return false;
    }
  }

  async updateUser(userId: string, updates: Partial<AccountSource>): Promise<boolean> {
    try {
      const payload: any = {};

      if (updates.email) payload.email = updates.email;
      if (updates.firstName) payload.firstname = updates.firstName;
      if (updates.lastName) payload.lastname = updates.lastName;
      if (updates.enabled !== undefined) payload.activated = updates.enabled;
      if (updates.locked !== undefined) payload.account_locked = updates.locked;

      await this.client.put(`/systemusers/${userId}`, payload);
      logger.info(`Updated JumpCloud user ${userId}`);
      return true;
    } catch (error) {
      logger.error('JumpCloud updateUser error:', error);
      return false;
    }
  }

  async expirePassword(userId: string): Promise<boolean> {
    try {
      await this.client.post(`/systemusers/${userId}/expire`);
      logger.info(`Expired password for JumpCloud user ${userId}`);
      return true;
    } catch (error) {
      logger.error('JumpCloud expirePassword error:', error);
      return false;
    }
  }

  async suspendUser(userId: string): Promise<boolean> {
    try {
      await this.client.put(`/systemusers/${userId}`, {
        activated: false,
        account_locked: true,
      });
      logger.info(`Suspended JumpCloud user ${userId}`);
      return true;
    } catch (error) {
      logger.error('JumpCloud suspendUser error:', error);
      return false;
    }
  }
}

export default new JumpCloudService();
