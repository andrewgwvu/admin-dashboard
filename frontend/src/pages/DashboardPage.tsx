import { Link } from 'react-router-dom';
import { Users, Network, Server, Activity } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your homelab management dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Account Management Card */}
        <Link
          to="/accounts"
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Account Management
                  </dt>
                  <dd className="text-xs text-gray-400 mt-1">
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
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Network className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Network Management
                  </dt>
                  <dd className="text-xs text-gray-400 mt-1">
                    Manage network devices and clients
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        {/* Identity Sources Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Identity Sources
                  </dt>
                  <dd className="text-xs text-gray-400 mt-1">
                    JumpCloud, Okta, Active Directory
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    System Status
                  </dt>
                  <dd className="text-xs text-gray-400 mt-1">
                    All systems operational
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/accounts"
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-sm font-medium text-gray-900">Search Accounts</h3>
            <p className="text-xs text-gray-500 mt-1">
              Find and manage user accounts across all identity sources
            </p>
          </Link>
          <Link
            to="/network"
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-sm font-medium text-gray-900">View Network Devices</h3>
            <p className="text-xs text-gray-500 mt-1">
              Monitor and manage your network infrastructure
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
