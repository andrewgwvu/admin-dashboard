import { SearchResult, UnifiedAccount, AccountSource, MFADevice } from '../types';
import jumpcloudService from './jumpcloud.service';
import oktaService from './okta.service';
import adService from './activedirectory.service';
import logger from '../config/logger';

class AccountService {
  async globalSearch(query: string): Promise<SearchResult[]> {
    try {
      // Search all sources in parallel
      const [jumpcloudResults, oktaResults, adResults] = await Promise.allSettled([
        jumpcloudService.searchUsers(query),
        oktaService.searchUsers(query),
        adService.searchUsers(query),
      ]);

      const allResults: SearchResult[] = [];

      if (jumpcloudResults.status === 'fulfilled') {
        allResults.push(...jumpcloudResults.value);
      } else {
        logger.warn('JumpCloud search failed:', jumpcloudResults.reason);
      }

      if (oktaResults.status === 'fulfilled') {
        allResults.push(...oktaResults.value);
      } else {
        logger.warn('Okta search failed:', oktaResults.reason);
      }

      if (adResults.status === 'fulfilled') {
        allResults.push(...adResults.value);
      } else {
        logger.warn('Active Directory search failed:', adResults.reason);
      }

      // Deduplicate results based on email
      const uniqueResults = this.deduplicateResults(allResults);

      return uniqueResults;
    } catch (error) {
      logger.error('Global search error:', error);
      throw new Error('Failed to perform global search');
    }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
      const key = result.email?.toLowerCase() || result.username?.toLowerCase() || result.id;
      if (!seen.has(key)) {
        seen.set(key, result);
      }
    }

    return Array.from(seen.values());
  }

  async getUnifiedAccount(identifier: string, source?: string): Promise<UnifiedAccount | null> {
    try {
      // First, try to find the account in all sources
      const accounts: AccountSource[] = [];
      let primarySource: 'jumpcloud' | 'okta' | 'active-directory' = 'jumpcloud';

      if (!source || source === 'jumpcloud') {
        const jcAccount = await jumpcloudService.getUserById(identifier);
        if (jcAccount) {
          accounts.push(jcAccount);
          if (!source) primarySource = 'jumpcloud';
        }
      }

      if (!source || source === 'okta') {
        const oktaAccount = await oktaService.getUserById(identifier);
        if (oktaAccount) {
          accounts.push(oktaAccount);
          if (!source && accounts.length === 0) primarySource = 'okta';
        }
      }

      if (!source || source === 'active-directory') {
        const adAccount = await adService.getUserByDN(identifier);
        if (adAccount) {
          accounts.push(adAccount);
          if (!source && accounts.length === 0) primarySource = 'active-directory';
        }
      }

      if (accounts.length === 0) {
        return null;
      }

      // If we have a primary email, try to find matching accounts in other sources
      const primaryEmail = accounts[0].email;
      if (primaryEmail && !source) {
        await this.findRelatedAccounts(primaryEmail, accounts);
      }

      // Get MFA devices from all sources
      const mfaDevices = await this.getAllMFADevices(accounts);

      return {
        primarySource,
        accounts,
        mfaDevices,
      };
    } catch (error) {
      logger.error('Get unified account error:', error);
      return null;
    }
  }

  private async findRelatedAccounts(email: string, existingAccounts: AccountSource[]): Promise<void> {
    const existingSources = new Set(existingAccounts.map(a => a.source));

    // Search for accounts with matching email in sources we haven't checked yet
    const searchPromises: Promise<SearchResult[]>[] = [];

    if (!existingSources.has('jumpcloud')) {
      searchPromises.push(jumpcloudService.searchUsers(email));
    }
    if (!existingSources.has('okta')) {
      searchPromises.push(oktaService.searchUsers(email));
    }
    if (!existingSources.has('active-directory')) {
      searchPromises.push(adService.searchUsers(email));
    }

    const searchResults = await Promise.allSettled(searchPromises);

    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        // Get full account details for matches
        for (const searchResult of result.value) {
          if (searchResult.email?.toLowerCase() === email.toLowerCase()) {
            let account: AccountSource | null = null;

            if (searchResult.source === 'jumpcloud') {
              account = await jumpcloudService.getUserById(searchResult.id);
            } else if (searchResult.source === 'okta') {
              account = await oktaService.getUserById(searchResult.id);
            } else if (searchResult.source === 'active-directory') {
              account = await adService.getUserByDN(searchResult.id);
            }

            if (account) {
              existingAccounts.push(account);
            }
          }
        }
      }
    }
  }

  private async getAllMFADevices(accounts: AccountSource[]): Promise<MFADevice[]> {
    const allDevices: MFADevice[] = [];

    for (const account of accounts) {
      try {
        let devices: MFADevice[] = [];

        if (account.source === 'jumpcloud') {
          devices = await jumpcloudService.getMFADevices(account.sourceId);
        } else if (account.source === 'okta') {
          devices = await oktaService.getMFADevices(account.sourceId);
        } else if (account.source === 'active-directory') {
          devices = await adService.getMFADevices(account.sourceId);
        }

        allDevices.push(...devices);
      } catch (error) {
        logger.error(`Failed to get MFA devices for ${account.source}:${account.sourceId}`, error);
      }
    }

    return allDevices;
  }

  async updateAccount(
    source: 'jumpcloud' | 'okta' | 'active-directory',
    sourceId: string,
    updates: Partial<AccountSource>
  ): Promise<boolean> {
    try {
      if (source === 'jumpcloud') {
        return await jumpcloudService.updateUser(sourceId, updates);
      } else if (source === 'okta') {
        return await oktaService.updateUser(sourceId, updates);
      } else if (source === 'active-directory') {
        return await adService.updateUser(sourceId, updates);
      }
      return false;
    } catch (error) {
      logger.error(`Update account error for ${source}:${sourceId}`, error);
      return false;
    }
  }

  async expirePassword(
    source: 'jumpcloud' | 'okta' | 'active-directory',
    sourceId: string
  ): Promise<boolean> {
    try {
      if (source === 'jumpcloud') {
        return await jumpcloudService.expirePassword(sourceId);
      } else if (source === 'okta') {
        return await oktaService.expirePassword(sourceId);
      } else if (source === 'active-directory') {
        return await adService.expirePassword(sourceId);
      }
      return false;
    } catch (error) {
      logger.error(`Expire password error for ${source}:${sourceId}`, error);
      return false;
    }
  }

  async resetMFA(
    source: 'jumpcloud' | 'okta' | 'active-directory',
    sourceId: string,
    factorId?: string
  ): Promise<boolean> {
    try {
      if (source === 'jumpcloud') {
        return await jumpcloudService.resetMFA(sourceId);
      } else if (source === 'okta') {
        return await oktaService.resetMFA(sourceId, factorId);
      } else if (source === 'active-directory') {
        // AD MFA reset would depend on your specific MFA solution
        return false;
      }
      return false;
    } catch (error) {
      logger.error(`Reset MFA error for ${source}:${sourceId}`, error);
      return false;
    }
  }

  async suspendAccount(
    source: 'jumpcloud' | 'okta' | 'active-directory',
    sourceId: string
  ): Promise<boolean> {
    try {
      if (source === 'jumpcloud') {
        return await jumpcloudService.suspendUser(sourceId);
      } else if (source === 'okta') {
        return await oktaService.suspendUser(sourceId);
      } else if (source === 'active-directory') {
        return await adService.updateUser(sourceId, { enabled: false });
      }
      return false;
    } catch (error) {
      logger.error(`Suspend account error for ${source}:${sourceId}`, error);
      return false;
    }
  }
}

export default new AccountService();
