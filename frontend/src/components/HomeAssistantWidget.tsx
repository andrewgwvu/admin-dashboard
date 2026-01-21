import { useEffect, useState } from 'react';
import {
  Lightbulb,
  Power,
  Settings,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  Loader,
  Home,
  Plus,
  Minus,
} from 'lucide-react';
import { homeAssistantService } from '../services/homeassistant.service';
import type { HALight } from '../types/homeassistant';

export default function HomeAssistantWidget() {
  const [lights, setLights] = useState<HALight[]>([]);
  const [lightsByArea, setLightsByArea] = useState<Map<string, HALight[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [configInput, setConfigInput] = useState({
    url: localStorage.getItem('ha_url') || '',
    accessToken: localStorage.getItem('ha_token') || '',
  });
  const [viewMode, setViewMode] = useState<'list' | 'areas'>('areas');

  useEffect(() => {
    const savedUrl = localStorage.getItem('ha_url');
    const savedToken = localStorage.getItem('ha_token');

    if (savedUrl && savedToken) {
      homeAssistantService.configure({ url: savedUrl, accessToken: savedToken });
      fetchLights();
    } else {
      setShowSettings(true);
    }
  }, []);

  const testConnection = async () => {
    if (!configInput.url || !configInput.accessToken) {
      setError('Please provide both URL and access token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      homeAssistantService.configure({
        url: configInput.url,
        accessToken: configInput.accessToken,
      });

      const result = await homeAssistantService.testConnection();
      setConnectionStatus(result.success ? 'connected' : 'disconnected');

      if (!result.success) {
        setError(result.error || 'Connection failed. Please check your URL and access token.');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!configInput.url || !configInput.accessToken) {
      setError('Please provide both URL and access token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      homeAssistantService.configure({
        url: configInput.url,
        accessToken: configInput.accessToken,
      });

      const result = await homeAssistantService.testConnection();

      if (result.success) {
        localStorage.setItem('ha_url', configInput.url);
        localStorage.setItem('ha_token', configInput.accessToken);
        setConnectionStatus('connected');
        setShowSettings(false);
        await fetchLights();
      } else {
        setError(result.error || 'Connection failed. Please check your configuration.');
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const fetchLights = async () => {
    setLoading(true);
    setError(null);

    try {
      const [allLights, lightsByAreaMap] = await Promise.all([
        homeAssistantService.getLights(),
        homeAssistantService.getLightsByArea(),
      ]);

      setLights(allLights);
      setLightsByArea(lightsByAreaMap);
      setConnectionStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lights');
      setConnectionStatus('disconnected');
      console.error('Failed to fetch lights:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLight = async (entityId: string) => {
    try {
      await homeAssistantService.toggleLight(entityId);
      await fetchLights();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle light');
    }
  };

  const adjustBrightness = async (entityId: string, change: number) => {
    try {
      const light = lights.find((l) => l.entity_id === entityId);
      if (!light) return;

      const currentBrightness = light.attributes.brightness || 0;
      const newBrightness = Math.max(0, Math.min(255, currentBrightness + change));

      if (newBrightness === 0) {
        await homeAssistantService.turnOffLight(entityId);
      } else {
        await homeAssistantService.setBrightness(entityId, newBrightness);
      }

      await fetchLights();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust brightness');
    }
  };

  const setBrightness = async (entityId: string, brightness: number) => {
    try {
      if (brightness === 0) {
        await homeAssistantService.turnOffLight(entityId);
      } else {
        await homeAssistantService.setBrightness(entityId, brightness);
      }
      await fetchLights();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set brightness');
    }
  };

  const setColor = async (entityId: string, color: string) => {
    try {
      const rgb = homeAssistantService.hexToRgb(color);
      await homeAssistantService.setRgbColor(entityId, rgb);
      await fetchLights();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set color');
    }
  };

  const renderLightControl = (light: HALight) => {
    const isOn = light.state === 'on';
    const brightness = light.attributes.brightness || 0;
    const brightnessPercent = Math.round((brightness / 255) * 100);
    const supportsColor = light.attributes.supported_color_modes?.includes('rgb') ||
                          light.attributes.supported_color_modes?.includes('rgbw') ||
                          light.attributes.supported_color_modes?.includes('hs');
    const currentColor = light.attributes.rgb_color
      ? homeAssistantService.rgbToHex(light.attributes.rgb_color)
      : '#ffffff';

    return (
      <div
        key={light.entity_id}
        className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center flex-1">
            <Lightbulb
              className={`h-5 w-5 mr-2 ${
                isOn ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-600'
              }`}
            />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {light.attributes.friendly_name || light.entity_id}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isOn ? `${brightnessPercent}% brightness` : 'Off'}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleLight(light.entity_id)}
            className={`p-2 rounded-lg transition-colors ${
              isOn
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>

        {isOn && (
          <div className="space-y-3">
            {/* Brightness Control */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Brightness</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => adjustBrightness(light.entity_id, -25)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-medium text-gray-900 dark:text-white w-8 text-center">
                    {brightnessPercent}%
                  </span>
                  <button
                    onClick={() => adjustBrightness(light.entity_id, 25)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={brightness}
                onChange={(e) => setBrightness(light.entity_id, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            {/* Color Control */}
            {supportsColor && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setColor(light.entity_id, e.target.value)}
                    className="h-8 w-full rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (showSettings || !homeAssistantService.isConfigured()) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Home className="h-5 w-5 mr-2" />
            HomeAssistant Configuration
          </h2>
          {homeAssistantService.isConfigured() && (
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              HomeAssistant URL
            </label>
            <input
              type="text"
              value={configInput.url}
              onChange={(e) => setConfigInput({ ...configInput, url: e.target.value })}
              placeholder="https://homeassistant.local:8123"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Long-Lived Access Token
            </label>
            <input
              type="password"
              value={configInput.accessToken}
              onChange={(e) => setConfigInput({ ...configInput, accessToken: e.target.value })}
              placeholder="Enter your HomeAssistant access token"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {connectionStatus !== 'unknown' && (
            <div
              className={`flex items-center p-3 rounded-lg ${
                connectionStatus === 'connected'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  <span className="text-sm">Connection successful!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Connection failed</span>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={testConnection}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </button>
            <button
              onClick={saveConfiguration}
              disabled={loading || connectionStatus !== 'connected'}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save & Connect
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Access Token:</strong> Create a long-lived access token in HomeAssistant.
              Go to Profile → Long-Lived Access Tokens → Create Token.
            </p>
          </div>

          {error && error.includes('CORS') && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                CORS Configuration Required
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
                Add this to your HomeAssistant <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">configuration.yaml</code>:
              </p>
              <pre className="text-xs bg-yellow-100 dark:bg-yellow-900 p-2 rounded overflow-x-auto text-yellow-900 dark:text-yellow-100">
{`http:
  cors_allowed_origins:
    - ${window.location.origin}
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - ::1`}
              </pre>
              <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-2">
                After adding this, restart HomeAssistant for changes to take effect.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Home className="h-5 w-5 mr-2" />
              HomeAssistant Lights
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {lights.length} light{lights.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'areas' : 'list')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={`Switch to ${viewMode === 'list' ? 'area' : 'list'} view`}
            >
              <Lightbulb className="h-4 w-4" />
            </button>
            <button
              onClick={fetchLights}
              disabled={loading}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && lights.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : error && lights.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-gray-900 dark:text-white font-medium">Failed to load lights</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
            <button
              onClick={fetchLights}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : lights.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-900 dark:text-white font-medium">No lights found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Make sure your HomeAssistant instance has light entities
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {lights.map((light) => renderLightControl(light))}
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(lightsByArea.entries()).map(([area, areaLights]) => (
              <div key={area}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  {area.charAt(0).toUpperCase() + area.slice(1)}
                </h3>
                <div className="space-y-3">
                  {areaLights.map((light) => renderLightControl(light))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
