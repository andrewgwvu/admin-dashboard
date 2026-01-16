import api from './api';
import { ApiResponse, SearchResult, UnifiedAccount, AccountSource } from '../types';

export const accountService = {
  async searchAccounts(query: string): Promise<SearchResult[]> {
    const response = await api.get<ApiResponse<SearchResult[]>>(
      `/accounts/search?query=${encodeURIComponent(query)}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Search failed');
  },

  async getUnifiedAccount(identifier: string, source?: string): Promise<UnifiedAccount> {
    const url = source
      ? `/accounts/${encodeURIComponent(identifier)}?source=${source}`
      : `/accounts/${encodeURIComponent(identifier)}`;

    const response = await api.get<ApiResponse<UnifiedAccount>>(url);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch account');
  },

  async updateAccount(
    source: string,
    sourceId: string,
    updates: Partial<AccountSource>
  ): Promise<void> {
    const response = await api.put<ApiResponse>(
      `/accounts/${source}/${encodeURIComponent(sourceId)}`,
      updates
    );

    if (!response.success) {
      throw new Error(response.error || 'Update failed');
    }
  },

  async expirePassword(source: string, sourceId: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/accounts/${source}/${encodeURIComponent(sourceId)}/expire-password`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to expire password');
    }
  },

  async resetMFA(source: string, sourceId: string, factorId?: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/accounts/${source}/${encodeURIComponent(sourceId)}/reset-mfa`,
      { factorId }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to reset MFA');
    }
  },

  async suspendAccount(source: string, sourceId: string): Promise<void> {
    const response = await api.post<ApiResponse>(
      `/accounts/${source}/${encodeURIComponent(sourceId)}/suspend`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to suspend account');
    }
  },
};
