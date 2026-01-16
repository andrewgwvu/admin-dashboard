import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, User, Calendar, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { accountService } from '../services/account.service';
import { UnifiedAccount } from '../types';

export default function AccountDetailPage() {
  const { identifier } = useParams<{ identifier: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || undefined;
  const navigate = useNavigate();

  const [account, setAccount] = useState<UnifiedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadAccount();
  }, [identifier, source]);

  const loadAccount = async () => {
    if (!identifier) return;

    setLoading(true);
    setError('');

    try {
      const data = await accountService.getUnifiedAccount(identifier, source);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading account</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Accounts
        </button>
      </div>
    );
  }

  const primaryAccount = account.accounts[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/accounts')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Accounts
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{primaryAccount.displayName}</h1>
        <p className="mt-1 text-gray-600">{primaryAccount.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Sources */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Account Sources</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {account.accounts.map((acc) => (
                <div key={`${acc.source}-${acc.sourceId}`} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {acc.source === 'active-directory'
                        ? 'Active Directory'
                        : acc.source === 'jumpcloud'
                        ? 'JumpCloud'
                        : 'Okta'}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        acc.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {acc.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">Username</dt>
                      <dd className="text-gray-900 font-medium">{acc.username}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Email</dt>
                      <dd className="text-gray-900">{acc.email}</dd>
                    </div>
                    {acc.passwordLastSet && (
                      <div>
                        <dt className="text-gray-500">Password Last Set</dt>
                        <dd className="text-gray-900">
                          {new Date(acc.passwordLastSet).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {acc.passwordExpiryDate && (
                      <div>
                        <dt className="text-gray-500">Password Expires</dt>
                        <dd className="text-gray-900">
                          {new Date(acc.passwordExpiryDate).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {acc.lastLogin && (
                      <div>
                        <dt className="text-gray-500">Last Login</dt>
                        <dd className="text-gray-900">
                          {new Date(acc.lastLogin).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-gray-500">MFA Status</dt>
                      <dd className="text-gray-900">
                        {acc.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleExpirePassword(acc.source, acc.sourceId)}
                      disabled={!!actionLoading}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                    >
                      Expire Password
                    </button>
                    <button
                      onClick={() => handleSuspendAccount(acc.source, acc.sourceId)}
                      disabled={!!actionLoading}
                      className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      Suspend Account
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MFA Devices */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">MFA Devices</h2>
              <button
                onClick={() => {
                  if (account.accounts.length > 0) {
                    handleResetMFA(
                      account.accounts[0].source,
                      account.accounts[0].sourceId
                    );
                  }
                }}
                disabled={!!actionLoading || account.mfaDevices.length === 0}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Reset All MFA
              </button>
            </div>
            {account.mfaDevices.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {account.mfaDevices.map((device) => (
                  <div key={device.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Type: {device.type} • Source: {device.source}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          device.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No MFA devices enrolled
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Full Name
                </dt>
                <dd className="text-sm font-medium text-gray-900 ml-6">
                  {primaryAccount.firstName} {primaryAccount.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </dt>
                <dd className="text-sm font-medium text-gray-900 ml-6">
                  {primaryAccount.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  MFA Devices
                </dt>
                <dd className="text-sm font-medium text-gray-900 ml-6">
                  {account.mfaDevices.length}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Account Sources
                </dt>
                <dd className="text-sm font-medium text-gray-900 ml-6">
                  {account.accounts.length}
                </dd>
              </div>
            </dl>
          </div>

          {/* Status Indicators */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Status</h2>
            <div className="space-y-2">
              {account.accounts.some((a) => !a.enabled) && (
                <div className="flex items-center text-sm">
                  <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                  <span className="text-gray-700">Account disabled in some sources</span>
                </div>
              )}
              {account.accounts.some((a) => a.locked) && (
                <div className="flex items-center text-sm">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                  <span className="text-gray-700">Account locked</span>
                </div>
              )}
              {account.mfaDevices.length === 0 && (
                <div className="flex items-center text-sm">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mr-2" />
                  <span className="text-gray-700">No MFA devices</span>
                </div>
              )}
              {account.accounts.every((a) => a.enabled) &&
                !account.accounts.some((a) => a.locked) && (
                  <div className="flex items-center text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                    <span className="text-gray-700">All systems operational</span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
