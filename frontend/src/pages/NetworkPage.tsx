import { useEffect, useState } from 'react';
import { Server, Wifi, Activity, RefreshCw, Power, Ban, Loader2, Cable, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Globe, CheckCircle, XCircle, Clock, Zap, Radio, Network, FileText, Download, Upload, TrendingUp } from 'lucide-react';
import { networkService } from '../services/network.service';
import { NetworkDevice, NetworkClient, SwitchPort, WLAN, TrafficStats, NetworkTopology, SystemLog } from '../types';

type Tab = 'devices' | 'clients' | 'ports' | 'wlans' | 'bandwidth' | 'topology' | 'wan' | 'alerts' | 'logs';
type SortField = 'name' | 'ip' | 'connection' | 'status';
type SortDirection = 'asc' | 'desc';

interface WANStatus {
  status: string;
  message?: string;
  gateway?: {
    id: string;
    name: string;
    ip: string;
    mac: string;
    status: string;
  };
  wanPorts?: {
    name: string;
    status: string;
    ipAddress: string;
    gateway: string;
    dns: string;
    uptime: number;
  }[];
}

interface AlertsData {
  data: any[];
  totalRows: number;
  currentPage: number;
  currentSize: number;
}

interface EventsData {
  data: any[];
  totalRows: number;
  currentPage: number;
  currentSize: number;
}

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState<Tab>('devices');
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [clients, setClients] = useState<NetworkClient[]>([]);
  const [switchPorts, setSwitchPorts] = useState<{ [switchId: string]: SwitchPort[] }>({});
  const [wlans, setWlans] = useState<WLAN[]>([]);
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [topology, setTopology] = useState<NetworkTopology | null>(null);
  const [wanStatus, setWanStatus] = useState<WANStatus | null>(null);
  const [alerts, setAlerts] = useState<AlertsData>({ data: [], totalRows: 0, currentPage: 1, currentSize: 100 });
  const [events, setEvents] = useState<EventsData>({ data: [], totalRows: 0, currentPage: 1, currentSize: 100 });
  const [logs, setLogs] = useState<{ data: SystemLog[]; totalRows: number; currentPage: number; currentSize: number }>({ data: [], totalRows: 0, currentPage: 1, currentSize: 100 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [alertsEventsTab, setAlertsEventsTab] = useState<'alerts' | 'events'>('alerts');
  const [selectedSwitch, setSelectedSwitch] = useState<string>('');

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
      } else if (activeTab === 'clients') {
        const data = await networkService.getClients();
        setClients(data);
      } else if (activeTab === 'ports') {
        const deviceData = await networkService.getDevices();
        setDevices(deviceData);
        const switches = deviceData.filter(d => d.type === 'switch');
        if (switches.length > 0 && !selectedSwitch) {
          setSelectedSwitch(switches[0].id);
        }
        if (selectedSwitch || switches[0]?.id) {
          const ports = await networkService.getSwitchPorts(selectedSwitch || switches[0].id);
          setSwitchPorts({ ...switchPorts, [selectedSwitch || switches[0].id]: ports });
        }
      } else if (activeTab === 'wlans') {
        const data = await networkService.getWLANs();
        setWlans(data);
      } else if (activeTab === 'bandwidth') {
        const data = await networkService.getTrafficStats();
        setTrafficStats(data);
      } else if (activeTab === 'topology') {
        const data = await networkService.getNetworkTopology();
        setTopology(data);
      } else if (activeTab === 'wan') {
        const data = await networkService.getWANStatus();
        setWanStatus(data);
      } else if (activeTab === 'alerts') {
        const alertsData = await networkService.getAlerts(1, 100);
        const eventsData = await networkService.getEvents(1, 100);
        setAlerts(alertsData);
        setEvents(eventsData);
      } else if (activeTab === 'logs') {
        const data = await networkService.getSystemLogs(1, 100);
        setLogs(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
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

  const handleToggleWLAN = async (wlanId: string, currentlyEnabled: boolean) => {
    const action = currentlyEnabled ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this WLAN?`)) return;

    setActionLoading(`wlan-${wlanId}`);
    try {
      await networkService.toggleWLAN(wlanId, !currentlyEnabled);
      alert(`WLAN ${action}d successfully`);
      await loadData();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} WLAN`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePortPoe = async (switchId: string, portId: number, currentlyEnabled: boolean) => {
    setActionLoading(`poe-${portId}`);
    try {
      await networkService.toggleSwitchPortPoe(switchId, portId, !currentlyEnabled);
      alert(`PoE ${!currentlyEnabled ? 'enabled' : 'disabled'} successfully`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle PoE');
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatBytesPerSecond = (bytes: number) => {
    return formatBytes(bytes) + '/s';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Network Management</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Manage TP-Link Omada network devices and clients</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
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
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'clients'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <Wifi className="inline-block w-5 h-5 mr-2" />
            Clients
          </button>
          <button
            onClick={() => setActiveTab('ports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'ports'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <Cable className="inline-block w-5 h-5 mr-2" />
            Switch Ports
          </button>
          <button
            onClick={() => setActiveTab('wlans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'wlans'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <Radio className="inline-block w-5 h-5 mr-2" />
            WLANs
          </button>
          <button
            onClick={() => setActiveTab('bandwidth')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'bandwidth'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <TrendingUp className="inline-block w-5 h-5 mr-2" />
            Bandwidth
          </button>
          <button
            onClick={() => setActiveTab('topology')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'topology'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <Network className="inline-block w-5 h-5 mr-2" />
            Topology
          </button>
          <button
            onClick={() => setActiveTab('wan')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'wan'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <Globe className="inline-block w-5 h-5 mr-2" />
            WAN Status
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <AlertTriangle className="inline-block w-5 h-5 mr-2" />
            Alerts & Events
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <FileText className="inline-block w-5 h-5 mr-2" />
            Logs
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Device</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">IP Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Firmware</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uptime</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {devices.map((device) => (
                        <tr key={device.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Server className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{device.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{device.model}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{device.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{device.ip}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{device.mac}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{device.firmwareVersion || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(device.status)}`}>
                              {device.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatUptime(device.uptime)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => handleRebootDevice(device.id)}
                              disabled={actionLoading === device.id}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                            >
                              <Power className="h-4 w-4 inline mr-1" />
                              Reboot
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No devices found</div>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('name')}>
                          Client <SortIcon field="name" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('ip')}>
                          IP Address <SortIcon field="ip" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('connection')}>
                          Connection <SortIcon field="connection" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Network Info</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('status')}>
                          Status <SortIcon field="status" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {getSortedClients().map((client) => (
                        <tr key={client.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {client.wireless ? <Wifi className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" /> : <Cable className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />}
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name || client.hostname || 'Unknown'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {client.mac}
                                  {client.vendor && ` • ${client.vendor}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.ip}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{client.wireless ? 'Wireless' : 'Wired'}</div>
                            {client.ssid && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                SSID: {client.ssid}
                                {client.signalStrength && ` (${client.signalStrength}%)`}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {client.vlan && `VLAN ${client.vlan}`}
                              {client.port && ` • Port ${client.port}`}
                            </div>
                            {client.parentDeviceMac && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Connected to: {client.parentDeviceMac}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${client.connected ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {client.connected ? 'Connected' : 'Disconnected'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleBlockClient(client.mac)}
                              disabled={actionLoading === client.mac}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            >
                              <Ban className="h-4 w-4 inline mr-1" />
                              Block
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No clients found</div>
              )}
            </div>
          )}

          {/* Switch Ports Tab */}
          {activeTab === 'ports' && (
            <div className="space-y-4">
              {devices.filter(d => d.type === 'switch').length > 0 ? (
                <>
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Switch:</label>
                    <select
                      value={selectedSwitch}
                      onChange={(e) => {
                        setSelectedSwitch(e.target.value);
                        loadData();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {devices.filter(d => d.type === 'switch').map(sw => (
                        <option key={sw.id} value={sw.id}>{sw.name} ({sw.ip})</option>
                      ))}
                    </select>
                  </div>

                  {selectedSwitch && switchPorts[selectedSwitch] && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Port</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Speed</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">PoE</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Connected Device</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {switchPorts[selectedSwitch].map((port) => (
                              <tr key={port.port}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{port.port}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{port.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${port.linkStatus === 'up' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {port.linkStatus}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{port.speed || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {port.poe ? (
                                    <div>
                                      <div>{port.poe.enabled ? 'Enabled' : 'Disabled'}</div>
                                      {port.poe.enabled && <div className="text-xs">{port.poe.power}W</div>}
                                    </div>
                                  ) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {port.connectedDevice ? `${port.connectedDevice.name} (${port.connectedDevice.type})` : 'None'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {port.poe && (
                                    <button
                                      onClick={() => handleTogglePortPoe(selectedSwitch, port.port, port.poe!.enabled)}
                                      disabled={actionLoading === `poe-${port.port}`}
                                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                                    >
                                      <Zap className="h-4 w-4 inline mr-1" />
                                      {port.poe.enabled ? 'Disable' : 'Enable'} PoE
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg px-6 py-12 text-center text-gray-500 dark:text-gray-400">No switches found</div>
              )}
            </div>
          )}

          {/* WLANs Tab */}
          {activeTab === 'wlans' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              {wlans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">SSID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Security</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {wlans.map((wlan: any) => (
                        <tr key={wlan.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{wlan.name || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{wlan.ssid}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{wlan.security || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${wlan.enable || wlan.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {wlan.enable || wlan.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleToggleWLAN(wlan.id, wlan.enable || wlan.enabled)}
                              disabled={actionLoading === `wlan-${wlan.id}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                            >
                              <Radio className="h-4 w-4 inline mr-1" />
                              {wlan.enable || wlan.enabled ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No WLANs found</div>
              )}
            </div>
          )}

          {/* Bandwidth Tab */}
          {activeTab === 'bandwidth' && trafficStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center">
                    <Download className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Download</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytesPerSecond(trafficStats.current.download)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center">
                    <Upload className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upload</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytesPerSecond(trafficStats.current.upload)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytesPerSecond(trafficStats.current.total)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {trafficStats.topClients && trafficStats.topClients.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Clients by Traffic</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Download</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Upload</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {trafficStats.topClients.map((client) => (
                          <tr key={client.mac}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{client.mac}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatBytes(client.download)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatBytes(client.upload)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{formatBytes(client.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Topology Tab */}
          {activeTab === 'topology' && topology && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Topology</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Infrastructure Devices ({topology.devices.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topology.devices.map((device) => (
                      <div key={device.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <Server className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{device.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{device.type}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div>IP: {device.ip}</div>
                          <div>MAC: {device.mac}</div>
                          {device.children.length > 0 && <div className="mt-1">Connected clients: {device.children.length}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {topology.clients.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Connected Clients ({topology.clients.length})</h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {topology.clients.length} client(s) connected to the network
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WAN Status Tab */}
          {activeTab === 'wan' && wanStatus && (
            <div className="space-y-6">
              {wanStatus.gateway && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                      <Server className="h-6 w-6 mr-2" />
                      Gateway
                    </h2>
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${wanStatus.gateway.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {wanStatus.gateway.status === 'online' ? <CheckCircle className="h-4 w-4 mr-1 inline" /> : <XCircle className="h-4 w-4 mr-1 inline" />}
                      {wanStatus.gateway.status}
                    </span>
                  </div>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{wanStatus.gateway.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">IP Address</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{wanStatus.gateway.ip}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">MAC Address</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{wanStatus.gateway.mac}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {wanStatus.wanPorts && wanStatus.wanPorts.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                      <Globe className="h-6 w-6 mr-2" />
                      WAN Ports
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Port Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">IP Address</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gateway</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">DNS</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Uptime</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {wanStatus.wanPorts.map((port, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{port.name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${port.status === 'connected' || port.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {port.status || 'unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{port.ipAddress || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{port.gateway || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{port.dns || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatUptime(port.uptime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {wanStatus.message && !wanStatus.gateway && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">{wanStatus.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Alerts & Events Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8 px-6">
                    <button
                      onClick={() => setAlertsEventsTab('alerts')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${alertsEventsTab === 'alerts' ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}`}
                    >
                      <AlertTriangle className="inline-block w-5 h-5 mr-2" />
                      Alerts ({alerts.totalRows})
                    </button>
                    <button
                      onClick={() => setAlertsEventsTab('events')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${alertsEventsTab === 'events' ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}`}
                    >
                      <Clock className="inline-block w-5 h-5 mr-2" />
                      Events ({events.totalRows})
                    </button>
                  </nav>
                </div>

                {alertsEventsTab === 'alerts' && (
                  <div>
                    {alerts.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Message</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {alerts.data.map((alert, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                    {alert.type || alert.alertType || 'Alert'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{alert.message || alert.description || 'No description'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{alert.time ? new Date(alert.time).toLocaleString() : 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-400 dark:text-green-500" />
                        <p className="mt-2">No active alerts</p>
                      </div>
                    )}
                  </div>
                )}

                {alertsEventsTab === 'events' && (
                  <div>
                    {events.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Message</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {events.data.map((event, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                    {event.type || event.eventType || 'Event'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{event.message || event.description || 'No description'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{event.time ? new Date(event.time).toLocaleString() : 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2">No recent events</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Logs Tab */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              {logs.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Device</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Message</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {logs.data.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.level === 'critical' || log.level === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              log.level === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {log.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.device || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{log.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No logs found</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Statistics */}
      {!loading && activeTab === 'devices' && (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Server className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Devices</dt>
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
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Online Devices</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">{devices.filter((d) => d.status === 'online').length}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Connected Clients</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">{clients.filter((c) => c.connected).length}</dd>
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
