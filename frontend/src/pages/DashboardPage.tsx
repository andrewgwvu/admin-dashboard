import { Link } from 'react-router-dom';
import { Users, Network, Server, Activity } from 'lucide-react';
import WeatherWidget from '../components/WeatherWidget';
import HomeAssistantWidget from '../components/HomeAssistantWidget';

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome to your homelab management dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Account Management Card */}
        <Link
          to="/accounts"
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 animate-slide-up"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Account Management
                  </dt>
                  <dd className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Search and manage user accounts
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        {/* Network Management Card */}
        <Link
          to="/network"
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Network className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Network Management
                  </dt>
                  <dd className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Manage network devices and clients
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        {/* Identity Sources Card */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Identity Sources
                  </dt>
                  <dd className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    JumpCloud, Okta, Active Directory
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    System Status
                  </dt>
                  <dd className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    All systems operational
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weather and HomeAssistant Widgets */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <WeatherWidget />
        <HomeAssistantWidget />
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/accounts"
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Search Accounts</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Find and manage user accounts across all identity sources
            </p>
          </Link>
          <Link
            to="/network"
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">View Network Devices</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Monitor and manage your network infrastructure
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
