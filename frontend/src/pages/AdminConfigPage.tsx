import React, { useEffect, useState } from 'react';
import { SystemConfig } from '../types';
import { adminService } from '../services/admin.service';
import { Settings, Save, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const AdminConfigPage: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    jumpcloud: {
      apiKey: '',
      orgId: '',
    },
    okta: {
      domain: '',
      apiToken: '',
    },
    activeDirectory: {
      url: '',
      baseDn: '',
      username: '',
      password: '',
    },
    omada: {
      url: '',
      username: '',
      password: '',
      siteId: '',
    },
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await adminService.getConfig();
      setConfig(data);
      setFormData({
        jumpcloud: {
          apiKey: '',
          orgId: data.integrations.jumpcloud.orgId || '',
        },
        okta: {
          domain: data.integrations.okta.domain || '',
          apiToken: '',
        },
        activeDirectory: {
          url: data.integrations.activeDirectory.url || '',
          baseDn: data.integrations.activeDirectory.baseDn || '',
          username: '',
          password: '',
        },
        omada: {
          url: data.integrations.omada.url || '',
          username: '',
          password: '',
          siteId: data.integrations.omada.siteId || '',
        },
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      const updateData: any = { integrations: {} };

      // Only include fields that have values
      if (formData.jumpcloud.apiKey || formData.jumpcloud.orgId) {
        updateData.integrations.jumpcloud = {};
        if (formData.jumpcloud.apiKey) updateData.integrations.jumpcloud.apiKey = formData.jumpcloud.apiKey;
        if (formData.jumpcloud.orgId) updateData.integrations.jumpcloud.orgId = formData.jumpcloud.orgId;
      }

      if (formData.okta.domain || formData.okta.apiToken) {
        updateData.integrations.okta = {};
        if (formData.okta.domain) updateData.integrations.okta.domain = formData.okta.domain;
        if (formData.okta.apiToken) updateData.integrations.okta.apiToken = formData.okta.apiToken;
      }

      if (formData.activeDirectory.url || formData.activeDirectory.baseDn || formData.activeDirectory.username || formData.activeDirectory.password) {
        updateData.integrations.activeDirectory = {};
        if (formData.activeDirectory.url) updateData.integrations.activeDirectory.url = formData.activeDirectory.url;
        if (formData.activeDirectory.baseDn) updateData.integrations.activeDirectory.baseDn = formData.activeDirectory.baseDn;
        if (formData.activeDirectory.username) updateData.integrations.activeDirectory.username = formData.activeDirectory.username;
        if (formData.activeDirectory.password) updateData.integrations.activeDirectory.password = formData.activeDirectory.password;
      }

      if (formData.omada.url || formData.omada.username || formData.omada.password || formData.omada.siteId) {
        updateData.integrations.omada = {};
        if (formData.omada.url) updateData.integrations.omada.url = formData.omada.url;
        if (formData.omada.username) updateData.integrations.omada.username = formData.omada.username;
        if (formData.omada.password) updateData.integrations.omada.password = formData.omada.password;
        if (formData.omada.siteId) updateData.integrations.omada.siteId = formData.omada.siteId;
      }

      await adminService.updateConfig(updateData);
      setSuccess('Configuration updated successfully. Note: Changes are in-memory only. Update .env file for persistence.');
      loadConfig();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update configuration');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
          </div>
          <button
            onClick={loadConfig}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
            {success}
          </div>
        )}
      </div>

      {config && (
        <div className="grid gap-6">
          {/* Current Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Integration Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                {config.integrations.jumpcloud.enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">JumpCloud</span>
              </div>
              <div className="flex items-center gap-2">
                {config.integrations.okta.enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">Okta</span>
              </div>
              <div className="flex items-center gap-2">
                {config.integrations.activeDirectory.enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">Active Directory</span>
              </div>
              <div className="flex items-center gap-2">
                {config.integrations.omada.enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">Omada</span>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* JumpCloud */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">JumpCloud Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.jumpcloud.apiKey}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jumpcloud: { ...formData.jumpcloud, apiKey: e.target.value },
                      })
                    }
                    placeholder="Leave blank to keep current value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Organization ID
                  </label>
                  <input
                    type="text"
                    value={formData.jumpcloud.orgId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jumpcloud: { ...formData.jumpcloud, orgId: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Okta */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Okta Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
                  <input
                    type="text"
                    value={formData.okta.domain}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        okta: { ...formData.okta, domain: e.target.value },
                      })
                    }
                    placeholder="your-domain.okta.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={formData.okta.apiToken}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        okta: { ...formData.okta, apiToken: e.target.value },
                      })
                    }
                    placeholder="Leave blank to keep current value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Active Directory */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Active Directory Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    LDAP URL
                  </label>
                  <input
                    type="text"
                    value={formData.activeDirectory.url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        activeDirectory: { ...formData.activeDirectory, url: e.target.value },
                      })
                    }
                    placeholder="ldaps://your-server:636"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base DN
                  </label>
                  <input
                    type="text"
                    value={formData.activeDirectory.baseDn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        activeDirectory: { ...formData.activeDirectory, baseDn: e.target.value },
                      })
                    }
                    placeholder="DC=domain,DC=local"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.activeDirectory.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        activeDirectory: { ...formData.activeDirectory, username: e.target.value },
                      })
                    }
                    placeholder="Leave blank to keep current value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.activeDirectory.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        activeDirectory: { ...formData.activeDirectory, password: e.target.value },
                      })
                    }
                    placeholder="Leave blank to keep current value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Omada */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">TP-Link Omada Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Controller URL
                  </label>
                  <input
                    type="text"
                    value={formData.omada.url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        omada: { ...formData.omada, url: e.target.value },
                      })
                    }
                    placeholder="https://controller:8043"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.omada.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        omada: { ...formData.omada, username: e.target.value },
                      })
                    }
                    placeholder="Leave blank to keep current value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.omada.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        omada: { ...formData.omada, password: e.target.value },
                      })
                    }
                    placeholder="Leave blank to keep current value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Site ID
                  </label>
                  <input
                    type="text"
                    value={formData.omada.siteId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        omada: { ...formData.omada, siteId: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminConfigPage;
