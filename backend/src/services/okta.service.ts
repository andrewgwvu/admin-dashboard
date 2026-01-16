import { Client } from '@okta/okta-sdk-nodejs';
import { AccountSource, MFADevice, SearchResult } from '../types';
import logger from '../config/logger';

class OktaService {
  private client: Client;

  constructor() {
    this.client = new Client({
      orgUrl: `https://${process.env.OKTA_DOMAIN}`,
      token: process.env.OKTA_API_TOKEN,
    });
  }

  async searchUsers(query: string): Promise<SearchResult[]> {
    try {
      const users = await this.client.userApi.listUsers({
        search: `(profile.email sw "${query}" or profile.login sw "${query}" or profile.firstName sw "${query}" or profile.lastName sw "${query}")`,
      });

      const results: SearchResult[] = [];
      for await (const user of users) {
        results.push({
          source: 'okta' as const,
          type: 'user' as const,
          id: user.id,
          displayName: `${user.profile.firstName} ${user.profile.lastName}`,
          email: user.profile.email,
          username: user.profile.login,
          attributes: user,
        });
      }

      return results;
    } catch (error) {
      logger.error('Okta search error:', error);
      throw new Error('Failed to search Okta users');
    }
  }

  async getUserById(userId: string): Promise<AccountSource | null> {
    try {
      const user = await this.client.userApi.getUser({ userId });

      return {
        source: 'okta',
        sourceId: user.id,
        username: user.profile.login,
        email: user.profile.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        displayName: `${user.profile.firstName} ${user.profile.lastName}`,
        enabled: user.status === 'ACTIVE',
        locked: user.status === 'LOCKED_OUT' || user.status === 'SUSPENDED',
        passwordLastSet: user.passwordChanged ? new Date(user.passwordChanged) : undefined,
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        mfaEnabled: false, // Will be determined by checking factors
        attributes: user,
      };
    } catch (error) {
      logger.error('Okta getUserById error:', error);
      return null;
    }
  }

  async getMFADevices(userId: string): Promise<MFADevice[]> {
    try {
      const factors = await this.client.userFactorApi.listFactors({ userId });
      const devices: MFADevice[] = [];

      for await (const factor of factors) {
        devices.push({
          id: factor.id,
          type: factor.factorType,
          name: this.getFactorName(factor.factorType),
          status: factor.status === 'ACTIVE' ? 'active' : 'inactive',
          enrolledAt: factor.created ? new Date(factor.created) : undefined,
          source: 'okta',
        });
      }

      return devices;
    } catch (error) {
      logger.error('Okta getMFADevices error:', error);
      return [];
    }
  }

  private getFactorName(factorType: string): string {
    const factorNames: Record<string, string> = {
      'push': 'Okta Verify Push',
      'token:software:totp': 'Authenticator App',
      'sms': 'SMS',
      'call': 'Voice Call',
      'email': 'Email',
      'token:hardware': 'Hardware Token',
      'u2f': 'Security Key (U2F)',
      'webauthn': 'Security Key (WebAuthn)',
    };
    return factorNames[factorType] || factorType;
  }

  async resetMFA(userId: string, factorId?: string): Promise<boolean> {
    try {
      if (factorId) {
        // Reset specific factor
        await this.client.userFactorApi.deleteFactor({ userId, factorId });
      } else {
        // Reset all factors
        const factors = await this.client.userFactorApi.listFactors({ userId });
        for await (const factor of factors) {
          await this.client.userFactorApi.deleteFactor({ userId, factorId: factor.id });
        }
      }
      logger.info(`MFA reset for Okta user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Okta resetMFA error:', error);
      return false;
    }
  }

  async updateUser(userId: string, updates: Partial<AccountSource>): Promise<boolean> {
    try {
      const profile: any = {};

      if (updates.email) profile.email = updates.email;
      if (updates.firstName) profile.firstName = updates.firstName;
      if (updates.lastName) profile.lastName = updates.lastName;

      await this.client.userApi.updateUser({ userId, user: { profile } });
      logger.info(`Updated Okta user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Okta updateUser error:', error);
      return false;
    }
  }

  async expirePassword(userId: string): Promise<boolean> {
    try {
      await this.client.userApi.expirePassword({ userId });
      logger.info(`Expired password for Okta user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Okta expirePassword error:', error);
      return false;
    }
  }

  async suspendUser(userId: string): Promise<boolean> {
    try {
      await this.client.userApi.suspendUser({ userId });
      logger.info(`Suspended Okta user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Okta suspendUser error:', error);
      return false;
    }
  }

  async activateUser(userId: string): Promise<boolean> {
    try {
      await this.client.userApi.activateUser({ userId, sendEmail: false });
      logger.info(`Activated Okta user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Okta activateUser error:', error);
      return false;
    }
  }

  async unlockUser(userId: string): Promise<boolean> {
    try {
      await this.client.userApi.unlockUser({ userId });
      logger.info(`Unlocked Okta user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Okta unlockUser error:', error);
      return false;
    }
  }
}

export default new OktaService();
