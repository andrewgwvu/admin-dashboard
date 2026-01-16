import {
  SearchResult,
  AggregatedSearchResult,
  UnifiedAccount,
  AccountSource,
  MFADevice,
} from '../types';
import jumpcloudService from './jumpcloud.service';
import oktaService from './okta.service';
import adService from './activedirectory.service';
import logger from '../config/logger';

type Source = 'jumpcloud' | 'okta' | 'active-directory';

const SOURCE_PRIORITY: Source[] = ['okta', 'jumpcloud', 'active-directory'];

function normalizeValue(value?: string): string | undefined {
  const v = (value || '').trim();
  return v ? v : undefined;
}

function buildPersonKey(result: SearchResult): string {
  const username = normalizeValue(result.username)?.toLowerCase();
  if (username) return `u:${username}`;
  const email = normalizeValue(result.email)?.toLowerCase();
  if (email) return `e:${email}`;
  return `i:${result.source}:${result.id}`;
}

function looksLikeDistinguishedName(input: string): boolean {
  const s = (input || '').trim();
  // Very loose: typical AD DN contains '=' and ','
  return s.includes('=') && s.includes(',');
}

class AccountService {
  /**
   * Search all sources and return person-level aggregated hits.
   *
   * IMPORTANT: We do NOT deduplicate away matches; instead we group them.
   */
  async globalSearch(query: string): Promise<AggregatedSearchResult[]> {
    const allResults = await this.searchAllSources(query);
    const grouped = this.groupResults(allResults);

    // Stable-ish sort: by displayName then email then username
    grouped.sort((a, b) => {
      const an = (a.displayName || '').toLowerCase();
      const bn = (b.displayName || '').toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      const ae = (a.email || '').toLowerCase();
      const be = (b.email || '').toLowerCase();
      if (ae !== be) return ae.localeCompare(be);
      const au = (a.username || '').toLowerCase();
      const bu = (b.username || '').toLowerCase();
      return au.localeCompare(bu);
    });

    return grouped;
  }

  private async searchAllSources(query: string): Promise<SearchResult[]> {
    try {
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

      return allResults;
    } catch (error) {
      logger.error('Search all sources error:', error);
      throw new Error('Failed to search accounts');
    }
  }

  private groupResults(results: SearchResult[]): AggregatedSearchResult[] {
    const map = new Map<string, AggregatedSearchResult>();

    for (const result of results) {
      const key = buildPersonKey(result);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          displayName: result.displayName,
          email: normalizeValue(result.email),
          username: normalizeValue(result.username),
          matches: [result],
          sources: [result.source],
        });
        continue;
      }

      existing.matches.push(result);
      if (!existing.sources.includes(result.source)) {
        existing.sources.push(result.source);
      }

      // Prefer "better" representative values if missing
      existing.displayName = existing.displayName || result.displayName;
      existing.email = existing.email || normalizeValue(result.email);
      existing.username = existing.username || normalizeValue(result.username);
    }

    // Ensure sources are ordered for UI consistency
    for (const v of map.values()) {
      v.sources.sort((a, b) => SOURCE_PRIORITY.indexOf(a) - SOURCE_PRIORITY.indexOf(b));
      v.matches.sort((a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source));
    }

    return Array.from(map.values());
  }

  async getUnifiedAccount(identifier: string, source?: string): Promise<UnifiedAccount | null> {
    try {
      const raw = (identifier || '').trim();
      if (!raw) return null;

      const decoded = this.decodeIdentifier(raw);
      const id = decoded.term;

      // If a specific source is requested, preserve the old behavior.
      if (source) {
        const account = await this.getAccountBySourceId(source as Source, id);
        if (!account) return null;

        const mfaDevices = await this.getAllMFADevices([account]);
        const accounts = this.applyMfaFlags([account], mfaDevices);

        return {
          primarySource: account.source,
          accounts,
          mfaDevices,
        };
      }

      const accounts: AccountSource[] = [];

      // 1) If the identifier encoded a concrete source/id, fetch that first.
      if (decoded.directSource && decoded.directId) {
        const direct = await this.getAccountBySourceId(decoded.directSource, decoded.directId);
        if (direct) accounts.push(direct);
      }

      // 2) Try direct lookup (identifier might be a real source id or an AD DN)
      if (accounts.length === 0) {
        const directAccounts = await this.tryDirectLookup(id);
        accounts.push(...directAccounts);
      }

      // 3) If nothing found directly, treat identifier as a search key and hydrate matches.
      if (accounts.length === 0) {
        const matches = await this.searchAllSources(id);
        const hydrated = await this.hydrateAccountsFromSearchResults(matches);
        accounts.push(...hydrated);
      }

      if (accounts.length === 0) return null;

      // 4) Find related accounts in other sources based on email/username.
      // This helps ensure we aggregate Okta + JumpCloud + AD accounts.
      await this.findRelatedAccounts(accounts);

      // De-dupe accounts by source+sourceId
      const uniqueAccounts = this.dedupeAccounts(accounts);

      // MFA
      const mfaDevices = await this.getAllMFADevices(uniqueAccounts);
      const accountsWithMfa = this.applyMfaFlags(uniqueAccounts, mfaDevices);

      const primarySource = this.choosePrimarySource(accountsWithMfa);

      return {
        primarySource,
        accounts: accountsWithMfa,
        mfaDevices,
      };
    } catch (error) {
      logger.error('Get unified account error:', error);
      return null;
    }
  }

  private decodeIdentifier(raw: string): { term: string; directSource?: Source; directId?: string } {
    const s = (raw || '').trim();
    if (!s) return { term: '' };

    if (s.startsWith('u:')) {
      return { term: s.slice(2) };
    }

    if (s.startsWith('e:')) {
      return { term: s.slice(2) };
    }

    if (s.startsWith('i:')) {
      // i:<source>:<id>
      const withoutPrefix = s.slice(2);
      const parts = withoutPrefix.split(':');
      const src = parts.shift();
      const rest = parts.join(':');

      if (src === 'okta' || src === 'jumpcloud' || src === 'active-directory') {
        return {
          term: rest || s,
          directSource: src,
          directId: rest,
        };
      }
    }

    return { term: s };
  }

  private async getAccountBySourceId(source: Source, sourceId: string): Promise<AccountSource | null> {
    if (source === 'jumpcloud') return await jumpcloudService.getUserById(sourceId);
    if (source === 'okta') return await oktaService.getUserById(sourceId);
    if (source === 'active-directory') return await adService.getUserByDN(sourceId);
    return null;
  }

  private async tryDirectLookup(identifier: string): Promise<AccountSource[]> {
    const tasks: Array<Promise<AccountSource | null>> = [
      oktaService.getUserById(identifier),
      jumpcloudService.getUserById(identifier),
    ];

    if (looksLikeDistinguishedName(identifier)) {
      tasks.push(adService.getUserByDN(identifier));
    } else {
      // Still try as DN - it will safely return null on failure
      tasks.push(adService.getUserByDN(identifier));
    }

    const settled = await Promise.allSettled(tasks);
    const accounts: AccountSource[] = [];
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) accounts.push(r.value);
    }

    return accounts;
  }

  private async hydrateAccountsFromSearchResults(results: SearchResult[]): Promise<AccountSource[]> {
    const maxHydrate = 10; // avoid huge fan-out on broad searches
    const slice = results.slice(0, maxHydrate);

    const accounts: AccountSource[] = [];
    for (const r of slice) {
      const acct = await this.getAccountBySourceId(r.source, r.id);
      if (acct) accounts.push(acct);
    }

    return accounts;
  }

  private async findRelatedAccounts(existing: AccountSource[]): Promise<void> {
    const existingSources = new Set(existing.map((a) => a.source));

    // Prefer most reliable keys for matching
    const emails = new Set(existing.map((a) => normalizeValue(a.email)?.toLowerCase()).filter(Boolean) as string[]);
    const usernames = new Set(existing.map((a) => normalizeValue(a.username)?.toLowerCase()).filter(Boolean) as string[]);

    const searchTerms: string[] = [];
    // Search by username first for the behavior you want
    for (const u of usernames) searchTerms.push(u);
    for (const e of emails) searchTerms.push(e);

    // If no usable keys, nothing to relate
    if (searchTerms.length === 0) return;

    // For each missing source, search using a few best terms
    const termsToTry = searchTerms.slice(0, 2);

    for (const src of ['okta', 'jumpcloud', 'active-directory'] as Source[]) {
      if (existingSources.has(src)) continue;

      for (const term of termsToTry) {
        try {
          let results: SearchResult[] = [];
          if (src === 'okta') results = await oktaService.searchUsers(term);
          if (src === 'jumpcloud') results = await jumpcloudService.searchUsers(term);
          if (src === 'active-directory') results = await adService.searchUsers(term);

          for (const r of results) {
            const rEmail = normalizeValue(r.email)?.toLowerCase();
            const rUser = normalizeValue(r.username)?.toLowerCase();

            const matchesByUsername = rUser && usernames.has(rUser);
            const matchesByEmail = rEmail && emails.has(rEmail);

            if (!matchesByUsername && !matchesByEmail) continue;

            const acct = await this.getAccountBySourceId(r.source, r.id);
            if (acct) existing.push(acct);
          }

          // If we found something for that source, stop trying more terms
          if (existing.some((a) => a.source === src)) break;
        } catch (err) {
          logger.warn(`Related account search failed for source=${src} term=${term}`, err);
        }
      }
    }
  }

  private dedupeAccounts(accounts: AccountSource[]): AccountSource[] {
    const seen = new Set<string>();
    const out: AccountSource[] = [];
    for (const a of accounts) {
      const k = `${a.source}:${a.sourceId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(a);
    }

    // Stable order for UI: okta -> jumpcloud -> ad
    out.sort((a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source));
    return out;
  }

  private choosePrimarySource(accounts: AccountSource[]): Source {
    for (const src of SOURCE_PRIORITY) {
      if (accounts.some((a) => a.source === src)) return src;
    }
    return 'jumpcloud';
  }

  private applyMfaFlags(accounts: AccountSource[], devices: MFADevice[]): AccountSource[] {
    const deviceSources = new Set(devices.map((d) => d.source));
    return accounts.map((a) => ({
      ...a,
      mfaEnabled: deviceSources.has(a.source) ? true : a.mfaEnabled,
    }));
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
        logger.error(
          `Failed to get MFA devices for ${account.source}:${account.sourceId}`,
          error
        );
      }
    }

    return allDevices;
  }

  async updateAccount(
    source: Source,
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

  async expirePassword(source: Source, sourceId: string): Promise<boolean> {
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

  async resetMFA(source: Source, sourceId: string, factorId?: string): Promise<boolean> {
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

  async suspendAccount(source: Source, sourceId: string): Promise<boolean> {
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
