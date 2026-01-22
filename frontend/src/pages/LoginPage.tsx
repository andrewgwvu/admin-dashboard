import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const handleOktaSSO = async () => {
    setError('');
    setLoading(true);

    try {
      const authUrl = await authService.initiateOktaSSO();
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message || 'SSO login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-end">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div>
          {localStorage.getItem('dashboard_logo') ? (
            <div className="flex justify-center mb-6">
              <img
                src={localStorage.getItem('dashboard_logo') || ''}
                alt="Dashboard Logo"
                className="h-24 w-auto"
              />
            </div>
          ) : (
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Homelab Dashboard
            </h2>
          )}
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sign in with your Okta account
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={handleOktaSSO}
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm0 3.6c-4.64 0-8.4 3.76-8.4 8.4 0 4.64 3.76 8.4 8.4 8.4 4.64 0 8.4-3.76 8.4-8.4 0-4.64-3.76-8.4-8.4-8.4z"/>
              </svg>
              {loading ? 'Redirecting to Okta...' : 'Sign in with Okta'}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            This dashboard uses Okta SSO for authentication
          </p>
        </div>
      </div>
    </div>
  );
}
