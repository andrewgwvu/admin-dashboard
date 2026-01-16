import * as ldap from 'ldapjs';
import { AccountSource, MFADevice, SearchResult } from '../types';
import logger from '../config/logger';

class ActiveDirectoryService {
  private client: ldap.Client | null = null;
  private url: string;
  private baseDN: string;
  private username: string;
  private password: string;

  constructor() {
    this.url = process.env.AD_URL || '';
    this.baseDN = process.env.AD_BASE_DN || '';
    this.username = process.env.AD_USERNAME || '';
    this.password = process.env.AD_PASSWORD || '';
  }

  private async getClient(): Promise<ldap.Client> {
    if (this.client) {
      return this.client;
    }

    return new Promise((resolve, reject) => {
      // Determine if using LDAPS based on URL
      const isLDAPS = this.url.toLowerCase().startsWith('ldaps://');

      const clientOptions: any = {
        url: this.url,
        reconnect: true,
      };

      // For LDAPS (Server 2022+), configure TLS options
      if (isLDAPS) {
        clientOptions.tlsOptions = {
          // Accept self-signed certificates (common in internal AD)
          rejectUnauthorized: false,
          // For production, you may want to validate certificates:
          // rejectUnauthorized: true,
          // ca: [fs.readFileSync('/path/to/ca-cert.pem')],
        };
        logger.info('Using LDAPS connection with TLS');
      } else {
        logger.warn('Using unencrypted LDAP connection (not recommended for Server 2022+)');
      }

      const client = ldap.createClient(clientOptions);

      // Handle connection errors
      client.on('error', (err) => {
        logger.error('LDAP client error:', err);
      });

      client.bind(this.username, this.password, (err) => {
        if (err) {
          logger.error('AD bind error:', err);
          logger.error('AD bind details:', {
            url: this.url,
            username: this.username,
            error: err.message,
          });
          reject(new Error('Failed to bind to Active Directory'));
          return;
        }
        logger.info('Successfully bound to Active Directory');
        this.client = client;
        resolve(client);
      });
    });
  }

  async searchUsers(query: string): Promise<SearchResult[]> {
    try {
      const client = await this.getClient();

      const searchFilter = `(&(objectClass=user)(objectCategory=person)(|(cn=*${query}*)(sAMAccountName=*${query}*)(mail=*${query}*)(displayName=*${query}*)))`;

      return new Promise((resolve, reject) => {
        const results: SearchResult[] = [];

        client.search(
          this.baseDN,
          {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['distinguishedName', 'sAMAccountName', 'mail', 'givenName', 'sn', 'displayName', 'userAccountControl'],
          },
          (err, res) => {
            if (err) {
              logger.error('AD search error:', err);
              reject(new Error('Failed to search Active Directory'));
              return;
            }

            res.on('searchEntry', (entry) => {
              const attrs = entry.pojo.attributes;
              const getAttr = (name: string) => attrs.find((a: any) => a.type === name)?.values[0];

              const dn = getAttr('distinguishedName');
              if (!dn) return; // Skip entries without DN

              results.push({
                source: 'active-directory' as const,
                type: 'user' as const,
                id: dn,
                displayName: getAttr('displayName') || `${getAttr('givenName') || ''} ${getAttr('sn') || ''}`.trim() || 'Unknown',
                email: getAttr('mail'),
                username: getAttr('sAMAccountName'),
                attributes: entry.pojo,
              });
            });

            res.on('error', (err) => {
              logger.error('AD search result error:', err);
              reject(err);
            });

            res.on('end', () => {
              resolve(results);
            });
          }
        );
      });
    } catch (error) {
      logger.error('AD search error:', error);
      throw new Error('Failed to search Active Directory');
    }
  }

  async getUserByDN(dn: string): Promise<AccountSource | null> {
    try {
      const client = await this.getClient();

      return new Promise((resolve) => {
        client.search(
          dn,
          {
            scope: 'base',
            attributes: ['*'],
          },
          (err, res) => {
            if (err) {
              logger.error('AD getUserByDN error:', err);
              resolve(null);
              return;
            }

            let foundUser: AccountSource | null = null;

            res.on('searchEntry', (entry) => {
              const attrs = entry.pojo.attributes;
              const getAttr = (name: string) => attrs.find((a: any) => a.type === name)?.values[0];

              const userAccountControl = parseInt(getAttr('userAccountControl') || '0');
              const accountDisabled = (userAccountControl & 0x0002) !== 0;
              const accountLocked = (userAccountControl & 0x0010) !== 0;

              const pwdLastSet = getAttr('pwdLastSet');
              const passwordLastSet = pwdLastSet && pwdLastSet !== '0'
                ? new Date(parseInt(pwdLastSet) / 10000 - 11644473600000)
                : undefined;

              foundUser = {
                source: 'active-directory',
                sourceId: getAttr('distinguishedName') || dn,
                username: getAttr('sAMAccountName') || '',
                email: getAttr('mail') || '',
                firstName: getAttr('givenName') || '',
                lastName: getAttr('sn') || '',
                displayName: getAttr('displayName') || `${getAttr('givenName') || ''} ${getAttr('sn') || ''}`.trim() || 'Unknown',
                enabled: !accountDisabled,
                locked: accountLocked,
                passwordLastSet,
                mfaEnabled: false, // AD MFA would typically be handled by separate system
                attributes: entry.pojo,
              };
            });

            res.on('error', (err) => {
              logger.error('AD getUserByDN result error:', err);
              resolve(null);
            });

            res.on('end', () => {
              resolve(foundUser);
            });
          }
        );
      });
    } catch (error) {
      logger.error('AD getUserByDN error:', error);
      return null;
    }
  }

  async getMFADevices(_userId: string): Promise<MFADevice[]> {
    // Active Directory MFA is typically handled by separate systems
    // like Azure MFA, Duo, or third-party solutions
    // This would need to be customized based on your specific MFA implementation
    return [];
  }

  async updateUser(dn: string, updates: Partial<AccountSource>): Promise<boolean> {
    try {
      const client = await this.getClient();
      const changes: ldap.Change[] = [];

      if (updates.email) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: {
            type: 'mail',
            values: [updates.email],
          },
        }));
      }

      if (updates.firstName) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: {
            type: 'givenName',
            values: [updates.firstName],
          },
        }));
      }

      if (updates.lastName) {
        changes.push(new ldap.Change({
          operation: 'replace',
          modification: {
            type: 'sn',
            values: [updates.lastName],
          },
        }));
      }

      if (updates.enabled !== undefined) {
        // Modify userAccountControl to enable/disable account
        const user = await this.getUserByDN(dn);
        if (user) {
          const currentUAC = parseInt((user.attributes as any).userAccountControl || '512');
          const newUAC = updates.enabled
            ? (currentUAC & ~0x0002) // Clear disabled bit
            : (currentUAC | 0x0002);  // Set disabled bit

          changes.push(new ldap.Change({
            operation: 'replace',
            modification: {
              type: 'userAccountControl',
              values: [newUAC.toString()],
            },
          }));
        }
      }

      if (changes.length === 0) {
        return true;
      }

      return new Promise((resolve) => {
        client.modify(dn, changes, (err) => {
          if (err) {
            logger.error('AD updateUser error:', err);
            resolve(false);
            return;
          }
          logger.info(`Updated AD user ${dn}`);
          resolve(true);
        });
      });
    } catch (error) {
      logger.error('AD updateUser error:', error);
      return false;
    }
  }

  async expirePassword(dn: string): Promise<boolean> {
    try {
      const client = await this.getClient();

      // Set pwdLastSet to 0 to force password change at next login
      const change = new ldap.Change({
        operation: 'replace',
        modification: {
          type: 'pwdLastSet',
          values: ['0'],
        },
      });

      return new Promise((resolve) => {
        client.modify(dn, change, (err) => {
          if (err) {
            logger.error('AD expirePassword error:', err);
            resolve(false);
            return;
          }
          logger.info(`Expired password for AD user ${dn}`);
          resolve(true);
        });
      });
    } catch (error) {
      logger.error('AD expirePassword error:', error);
      return false;
    }
  }

  async unlockUser(dn: string): Promise<boolean> {
    try {
      const client = await this.getClient();

      // Set lockoutTime to 0 to unlock account
      const change = new ldap.Change({
        operation: 'replace',
        modification: {
          type: 'lockoutTime',
          values: ['0'],
        },
      });

      return new Promise((resolve) => {
        client.modify(dn, change, (err) => {
          if (err) {
            logger.error('AD unlockUser error:', err);
            resolve(false);
            return;
          }
          logger.info(`Unlocked AD user ${dn}`);
          resolve(true);
        });
      });
    } catch (error) {
      logger.error('AD unlockUser error:', error);
      return false;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.unbind();
      this.client = null;
    }
  }
}

export default new ActiveDirectoryService();
