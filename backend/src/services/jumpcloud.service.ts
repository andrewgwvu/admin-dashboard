import axios, { AxiosInstance } from 'axios';
import { AccountSource, MFADevice, SearchResult } from '../types';
import logger from '../config/logger';

class JumpCloudService {
  private client: AxiosInstance;
  private apiKey: string;
  // private orgId: string; // Unused for now, may be needed for multi-org setups

  constructor() {
    this.apiKey = process.env.JUMPCLOUD_API_KEY || '';
    // this.orgId = process.env.JUMPCLOUD_ORG_ID || '';

    this.client = axios.create({
      baseURL: 'https://console.jumpcloud.com/api',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async searchUsers(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.client.post('/search/systemusers', {
        filter: [
          {
            $or: [
              { email: { $regex: query, $options: 'i' } },
              { username: { $regex: query, $options: 'i' } },
              { firstname: { $regex: query, $options: 'i' } },
              { lastname: { $regex: query, $options: 'i' } },
            ],
          },
        ],
        fields: ['username', 'email', 'firstname', 'lastname', 'displayname', 'activated', 'account_locked'],
      });

      return response.data.results.map((user: any) => ({
        source: 'jumpcloud' as const,
        type: 'user' as const,
        id: user._id,
        displayName: user.displayname || `${user.firstname} ${user.lastname}`,
        email: user.email,
        username: user.username,
        attributes: user,
      }));
    } catch (error) {
      logger.error('JumpCloud search error:', error);
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
