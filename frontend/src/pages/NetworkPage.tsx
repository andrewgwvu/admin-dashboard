import { useEffect, useState } from 'react';
import { Server, Wifi, Activity, RefreshCw, Power, Ban, Loader2, Cable, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { networkService } from '../services/network.service';
import { NetworkDevice, NetworkClient } from '../types';

type Tab = 'devices' | 'clients';
type SortField = 'name' | 'ip' | 'connection' | 'status';
type SortDirection = 'asc' | 'desc';

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState<Tab>('devices');
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [clients, setClients] = useState<NetworkClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'devices') {
        const data = await networkService.getDevices();
        setDevices(data);
      } else {
        const data = await networkService.getClients();
        setClients(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedClients = () => {
    const sorted = [...clients].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = (a.name || a.hostname || a.mac || '').toLowerCase();
          bValue = (b.name || b.hostname || b.mac || '').toLowerCase();
          break;
        case 'ip':
          aValue = a.ip || '';
          bValue = b.ip || '';
          break;
        case 'connection':
          aValue = a.wireless ? 'wireless' : 'wired';
          bValue = b.wireless ? 'wireless' : 'wired';
          break;
        case 'status':
          aValue = a.connected ? 'connected' : 'disconnected';
          bValue = b.connected ? 'connected' : 'disconnected';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1 inline" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 inline" />
    );
  };

  const handleRebootDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to reboot this device?')) return;

    setActionLoading(deviceId);
    try {
      await networkService.rebootDevice(deviceId);
      alert('Device reboot initiated');
    } catch (err: any) {
      alert(err.message || 'Failed to reboot device');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockClient = async (clientMac: string) => {
    if (!confirm('Are you sure you want to block this client?')) return;

    setActionLoading(clientMac);
    try {
      await networkService.blockClient(clientMac);
      alert('Client blocked successfully');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to block client');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'offline':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Network Management</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Manage TP-Link Omada network devices and clients</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'devices'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <Server className="inline-block w-5 h-5 mr-2" />
            Devices
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clients'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <Wifi className="inline-block w-5 h-5 mr-2" />
            Clients
          </button>
        </nav>
      </div>

      {/* Refresh Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      ) : (
        <>
          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              {devices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Device
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Uptime
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {devices.map((device) => (
                        <tr key={device.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Server className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {device.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{device.model}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {device.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{device.ip}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{device.mac}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                device.status
                              )}`}
                            >
                              {device.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatUptime(device.uptime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleRebootDevice(device.id)}
                              disabled={actionLoading === device.id}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 flex items-center"
                            >
                              <Power className="h-4 w-4 mr-1" />
                              Reboot
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No devices found
                </div>
              )}
            </div>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              {clients.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          Client
                          <SortIcon field="name" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('ip')}
                        >
                          IP Address
                          <SortIcon field="ip" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('connection')}
                        >
                          Connection
                          <SortIcon field="connection" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <SortIcon field="status" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {getSortedClients().map((client) => (
                        <tr key={client.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {client.wireless ? (
                                <Wifi className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                              ) : (
                                <Cable className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {client.name || client.hostname || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {client.mac}
                                  {client.vendor && ` • ${client.vendor}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {client.ip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {client.wireless ? 'Wireless' : 'Wired'}
                            </div>
                            {client.ssid && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                SSID: {client.ssid}
                                {client.signalStrength && ` (${client.signalStrength}%)`}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                client.connected
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {client.connected ? 'Connected' : 'Disconnected'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleBlockClient(client.mac)}
                              disabled={actionLoading === client.mac}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 flex items-center"
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Block
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No clients found
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Statistics */}
      {!loading && (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Server className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Devices
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">{devices.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-6 w-6 text-green-400 dark:text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Online Devices
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {devices.filter((d) => d.status === 'online').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Wifi className="h-6 w-6 text-blue-400 dark:text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Connected Clients
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {clients.filter((c) => c.connected).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
