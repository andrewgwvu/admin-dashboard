import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  User,
  Calendar,
  Shield,
  AlertCircle,
  Loader2,
  Layers,
  Fingerprint,
} from 'lucide-react';
import { accountService } from '../services/account.service';
import { AccountSource, UnifiedAccount } from '../types';

type TabId = 'overview' | 'accounts' | 'mfa';

type FlatAttribute = { key: string; value: string };

function formatSourceName(source: string) {
  if (source === 'active-directory') return 'Active Directory';
  if (source === 'jumpcloud') return 'JumpCloud';
  return 'Okta';
}

function safeStringify(value: unknown, maxLen = 500): string {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (str.length <= maxLen) return str;
    return `${str.slice(0, maxLen)}…`;
  } catch {
    return String(value);
  }
}

function flattenAttributes(input: any, prefix = '', out: FlatAttribute[] = [], depth = 0): FlatAttribute[] {
  // Keep the UI readable even if a source returns a giant nested object.
  if (depth > 4) {
    out.push({ key: prefix || '(root)', value: safeStringify(input) });
    return out;
  }

  if (input === null || input === undefined) {
    out.push({ key: prefix || '(root)', value: '' });
    return out;
  }

  const t = typeof input;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    out.push({ key: prefix || '(root)', value: String(input) });
    return out;
  }

  if (input instanceof Date) {
    out.push({ key: prefix || '(root)', value: input.toISOString() });
    return out;
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      out.push({ key: prefix || '(root)', value: '[]' });
      return out;
    }

    // If array is simple, show it inline.
    const isSimple = input.every(
      (v) => v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v)
    );
    if (isSimple) {
      out.push({ key: prefix || '(root)', value: input.map((v) => (v ?? '')).join(', ') });
      return out;
    }

    // Otherwise, index keys.
    input.forEach((v, idx) => {
      const nextKey = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      flattenAttributes(v, nextKey, out, depth + 1);
    });
    return out;
  }

  if (t === 'object') {
    const keys = Object.keys(input).sort();
    if (keys.length === 0) {
      out.push({ key: prefix || '(root)', value: '{}' });
      return out;
    }
    keys.forEach((k) => {
      const nextKey = prefix ? `${prefix}.${k}` : k;
      flattenAttributes(input[k], nextKey, out, depth + 1);
    });
    return out;
  }

  out.push({ key: prefix || '(root)', value: safeStringify(input) });
  return out;
}

export default function AccountDetailPage() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<UnifiedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier]);

  const loadAccount = async () => {
    if (!identifier) return;

    setLoading(true);
    setError('');

    try {
      // identifier is a unified key (u:<username>, e:<email>, i:<source>:<id>)
      const data = await accountService.getUnifiedAccount(identifier);
      setAccount(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const handleExpirePassword = async (accountSource: string, sourceId: string) => {
    if (!confirm('Are you sure you want to expire this password?')) return;

    setActionLoading('expire-password');
    try {
      await accountService.expirePassword(accountSource, sourceId);
      alert('Password expired successfully');
      await loadAccount();
    } catch (err: any) {
      alert(err.message || 'Failed to expire password');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetMFA = async (accountSource: string, sourceId: string) => {
    if (!confirm('Are you sure you want to reset MFA for this account?')) return;

    setActionLoading('reset-mfa');
    try {
      await accountService.resetMFA(accountSource, sourceId);
      alert('MFA reset successfully');
      await loadAccount();
    } catch (err: any) {
      alert(err.message || 'Failed to reset MFA');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendAccount = async (accountSource: string, sourceId: string) => {
    if (!confirm('Are you sure you want to suspend this account?')) return;

    setActionLoading('suspend');
    try {
      await accountService.suspendAccount(accountSource, sourceId);
      alert('Account suspended successfully');
      await loadAccount();
    } catch (err: any) {
      alert(err.message || 'Failed to suspend account');
    } finally {
      setActionLoading(null);
    }
  };

  const primaryAccount = account?.accounts?.[0];

  const accountsBySource = useMemo(() => {
    const map = new Map<string, AccountSource>();
    (account?.accounts || []).forEach((a) => map.set(a.source, a));
    return map;
  }, [account]);

  const allAttributesBySource = useMemo(() => {
    const out: Record<string, FlatAttribute[]> = {};
    (account?.accounts || []).forEach((a) => {
      out[a.source] = flattenAttributes(a.attributes);
    });
    return out;
  }, [account]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (error || !account || !primaryAccount) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Error loading account</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Back to Accounts
        </button>
      </div>
    );
  }

  const TabButton = ({ id, label, icon }: { id: TabId; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        tab === id
          ? 'border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-400'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/accounts')}
          className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Accounts
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{primaryAccount.displayName}</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">{primaryAccount.email || '(no email)'}</p>

        {/* Tabs */}
        <div className="mt-5 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          <TabButton id="overview" label="Overview" icon={<Layers className="h-4 w-4" />} />
          <TabButton id="accounts" label="Accounts" icon={<User className="h-4 w-4" />} />
          <TabButton id="mfa" label="MFA" icon={<Fingerprint className="h-4 w-4" />} />
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Summary</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Username</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">{primaryAccount.username || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="text-gray-900 dark:text-white">{primaryAccount.email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Account Sources</dt>
                  <dd className="text-gray-900 dark:text-white">{account.accounts.length}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">MFA Devices</dt>
                  <dd className="text-gray-900 dark:text-white">{account.mfaDevices.length}</dd>
                </div>
              </dl>

              <div className="mt-6 text-sm text-gray-600 dark:text-gray-300">
                This user has matching accounts in:{' '}
                <span className="text-gray-900 dark:text-white font-medium">
                  {account.accounts
                    .map((a) => (a.source === 'active-directory' ? 'AD' : a.source === 'jumpcloud' ? 'JumpCloud' : 'Okta'))
                    .join(', ')}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status</h2>
              <div className="space-y-2">
                {account.accounts.some((a) => !a.enabled) && (
                  <div className="flex items-center text-sm">
                    <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">Account disabled in some sources</span>
                  </div>
                )}
                {account.accounts.some((a) => a.locked) && (
                  <div className="flex items-center text-sm">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">Account locked in some sources</span>
                  </div>
                )}
                {account.mfaDevices.length === 0 && (
                  <div className="flex items-center text-sm">
                    <div className="h-2 w-2 rounded-full bg-orange-500 mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">No MFA devices found</span>
                  </div>
                )}
                {account.accounts.every((a) => a.enabled) && !account.accounts.some((a) => a.locked) && (
                  <div className="flex items-center text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">All systems operational</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Info</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Full Name
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white ml-6">
                    {primaryAccount.firstName} {primaryAccount.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white ml-6">
                    {primaryAccount.email || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    MFA Devices
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white ml-6">
                    {account.mfaDevices.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Account Sources
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white ml-6">
                    {account.accounts.length}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Actions</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Actions run against a specific source account. Use the Accounts tab to pick the account.
              </p>
              <div className="space-y-3">
                {['okta', 'jumpcloud', 'active-directory'].map((source) => {
                  const acc = accountsBySource.get(source);
                  if (!acc) return null;
                  return (
                    <div key={source} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatSourceName(source)}</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            acc.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {acc.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleExpirePassword(acc.source, acc.sourceId)}
                          disabled={!!actionLoading}
                          className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50"
                        >
                          Expire Password
                        </button>
                        <button
                          onClick={() => handleSuspendAccount(acc.source, acc.sourceId)}
                          disabled={!!actionLoading}
                          className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => handleResetMFA(acc.source, acc.sourceId)}
                          disabled={!!actionLoading}
                          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                        >
                          Reset MFA
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Accounts</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                This view aggregates matching accounts from Okta, JumpCloud, and Active Directory.
              </p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {account.accounts.map((acc) => (
                <div key={`${acc.source}-${acc.sourceId}`} className="px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{formatSourceName(acc.source)}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{acc.username || '—'}</span>
                        {acc.email ? <span className="ml-3">{acc.email}</span> : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          acc.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {acc.enabled ? 'Active' : 'Disabled'}
                      </span>
                      {acc.locked && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">Locked</span>
                      )}
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Source ID</dt>
                      <dd className="text-gray-900 dark:text-white font-mono text-xs break-all">{acc.sourceId}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">MFA</dt>
                      <dd className="text-gray-900 dark:text-white">{acc.mfaEnabled ? 'Enabled' : 'Disabled'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Password Last Set</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {acc.passwordLastSet ? new Date(acc.passwordLastSet).toLocaleString() : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Last Login</dt>
                      <dd className="text-gray-900 dark:text-white">{acc.lastLogin ? new Date(acc.lastLogin).toLocaleString() : '—'}</dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <details className="group">
                      <summary className="cursor-pointer select-none text-sm font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        View all attributes
                        <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">({allAttributesBySource[acc.source]?.length || 0})</span>
                      </summary>
                      <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                          {(allAttributesBySource[acc.source] || []).map((attr) => (
                            <div
                              key={attr.key}
                              className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 last:border-b-0"
                            >
                              <div className="text-xs text-gray-500 dark:text-gray-400 break-all">{attr.key}</div>
                              <div className="text-sm text-gray-900 dark:text-white mt-1 break-all font-mono">
                                {attr.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleExpirePassword(acc.source, acc.sourceId)}
                      disabled={!!actionLoading}
                      className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50"
                    >
                      Expire Password
                    </button>
                    <button
                      onClick={() => handleSuspendAccount(acc.source, acc.sourceId)}
                      disabled={!!actionLoading}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                    >
                      Suspend Account
                    </button>
                    <button
                      onClick={() => handleResetMFA(acc.source, acc.sourceId)}
                      disabled={!!actionLoading}
                      className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                    >
                      Reset MFA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'mfa' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">MFA Devices</h2>
            <button
              onClick={() => {
                if (account.accounts.length > 0) {
                  handleResetMFA(account.accounts[0].source, account.accounts[0].sourceId);
                }
              }}
              disabled={!!actionLoading || account.mfaDevices.length === 0}
              className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
            >
              Reset All MFA
            </button>
          </div>

          {account.mfaDevices.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {account.mfaDevices.map((device) => (
                <div key={device.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{device.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Type: {device.type} • Source: {formatSourceName(device.source)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        device.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {device.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No MFA devices enrolled</div>
          )}
        </div>
      )}
    </div>
  );
}
