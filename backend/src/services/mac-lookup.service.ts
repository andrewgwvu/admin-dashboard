import axios from 'axios';
import logger from '../config/logger';

// Simple in-memory cache to avoid rate limiting
const macVendorCache = new Map<string, { vendor: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

class MacLookupService {
  /**
   * Lookup MAC address vendor using macvendors.com API
   * Rate limit: 1000 requests per day
   */
  async lookupVendor(mac: string): Promise<string | null> {
    try {
      // Normalize MAC address (remove separators and convert to uppercase)
      const normalizedMac = mac.replace(/[:-]/g, '').toUpperCase();

      // Check cache first
      const cached = macVendorCache.get(normalizedMac);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.vendor;
      }

      // Call the API
      const response = await axios.get(`https://api.macvendors.com/${encodeURIComponent(mac)}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200 && response.data) {
        const vendor = response.data.trim();

        // Cache the result
        macVendorCache.set(normalizedMac, {
          vendor,
          timestamp: Date.now(),
        });

        return vendor;
      }

      // Vendor not found or rate limited
      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Vendor not found, cache empty result
        macVendorCache.set(mac.replace(/[:-]/g, '').toUpperCase(), {
          vendor: 'Unknown',
          timestamp: Date.now(),
        });
        return 'Unknown';
      }

      logger.error(`MAC lookup error for ${mac}:`, error.message);
      return null;
    }
  }

  /**
   * Lookup multiple MAC addresses in batch
   * Delays between requests to avoid rate limiting
   */
  async lookupBatch(macs: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const mac of macs) {
      const vendor = await this.lookupVendor(mac);
      if (vendor) {
        results[mac] = vendor;
      }

      // Small delay to avoid rate limiting
      if (macs.indexOf(mac) < macs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    macVendorCache.clear();
  }
}

export default new MacLookupService();
