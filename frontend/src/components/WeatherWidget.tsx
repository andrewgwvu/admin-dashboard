import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Eye,
  Gauge,
  AlertTriangle,
  MapPin,
  Radio,
  Thermometer,
  Sun,
  Moon,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  X
} from 'lucide-react';
import { weatherService } from '../services/weather.service';
import type { WeatherData, ForecastPeriod } from '../types/weather';

interface WeatherWidgetProps {
  latitude?: number;
  longitude?: number;
}

export default function WeatherWidget({ latitude, longitude }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'forecast' | 'hourly' | 'alerts' | 'details'>('current');
  const [locationInput, setLocationInput] = useState({ lat: latitude?.toString() || '', lon: longitude?.toString() || '', zipCode: '' });
  const [inputMode, setInputMode] = useState<'zipcode' | 'coords'>('zipcode');
  const [showSettings, setShowSettings] = useState(!latitude || !longitude);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    if (latitude && longitude) {
      fetchWeatherData(latitude, longitude);
    }
  }, [latitude, longitude]);

  const fetchWeatherData = async (lat: number, lon: number, cityState?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await weatherService.getComprehensiveWeatherData(lat, lon);
      setWeatherData(data);
      if (cityState) {
        setLocationName(cityState);
      }
      setShowSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (inputMode === 'zipcode') {
        if (!locationInput.zipCode || locationInput.zipCode.length !== 5) {
          setError('Please enter a valid 5-digit ZIP code');
          setLoading(false);
          return;
        }

        const result = await weatherService.getCoordinatesFromZipCode(locationInput.zipCode);
        await fetchWeatherData(result.latitude, result.longitude, `${result.city}, ${result.state}`);
      } else {
        const lat = parseFloat(locationInput.lat);
        const lon = parseFloat(locationInput.lon);
        if (isNaN(lat) || isNaN(lon)) {
          setError('Please enter valid coordinates');
          setLoading(false);
          return;
        }
        await fetchWeatherData(lat, lon);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      setLoading(false);
    }
  };

  const getWeatherIcon = (shortForecast: string, isDaytime: boolean) => {
    const forecast = shortForecast.toLowerCase();
    if (forecast.includes('snow')) return <CloudSnow className="h-8 w-8" />;
    if (forecast.includes('rain') || forecast.includes('shower')) return <CloudRain className="h-8 w-8" />;
    if (forecast.includes('thunder') || forecast.includes('storm')) return <CloudLightning className="h-8 w-8" />;
    if (forecast.includes('fog') || forecast.includes('mist')) return <CloudFog className="h-8 w-8" />;
    if (forecast.includes('drizzle')) return <CloudDrizzle className="h-8 w-8" />;
    if (forecast.includes('cloud') || forecast.includes('overcast')) return <Cloud className="h-8 w-8" />;
    if (forecast.includes('clear') || forecast.includes('sunny')) {
      return isDaytime ? <Sun className="h-8 w-8 text-yellow-500" /> : <Moon className="h-8 w-8 text-blue-300" />;
    }
    return <Cloud className="h-8 w-8" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'extreme': return 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-900 dark:text-red-200';
      case 'severe': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-900 dark:text-orange-200';
      case 'moderate': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-900 dark:text-yellow-200';
      case 'minor': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-500 text-gray-900 dark:text-gray-200';
    }
  };

  if (showSettings || (!latitude && !longitude)) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Weather Configuration
          </h2>
          {weatherData && (
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Input Mode Toggle */}
        <div className="mb-4 flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setInputMode('zipcode')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              inputMode === 'zipcode'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            ZIP Code
          </button>
          <button
            type="button"
            onClick={() => setInputMode('coords')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              inputMode === 'coords'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Coordinates
          </button>
        </div>

        <form onSubmit={handleLocationSubmit} className="space-y-4">
          {inputMode === 'zipcode' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                maxLength={5}
                pattern="[0-9]{5}"
                value={locationInput.zipCode}
                onChange={(e) => setLocationInput({ ...locationInput, zipCode: e.target.value })}
                placeholder="e.g., 10001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter a 5-digit US ZIP code
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={locationInput.lat}
                  onChange={(e) => setLocationInput({ ...locationInput, lat: e.target.value })}
                  placeholder="e.g., 39.7456"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={locationInput.lon}
                  onChange={(e) => setLocationInput({ ...locationInput, lon: e.target.value })}
                  placeholder="e.g., -104.9916"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              'Get Weather'
            )}
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Weather data provided by NOAA/NWS
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="text-red-600 dark:text-red-400 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Change location
        </button>
      </div>
    );
  }

  if (!weatherData) {
    return null;
  }

  const currentPeriod = weatherData.forecast?.properties.periods[0];
  const observation = weatherData.latestObservation?.properties;
  const alerts = weatherData.alerts?.features || [];

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Cloud className="h-5 w-5 mr-2" />
              Weather Dashboard
            </h2>
            {(locationName || weatherData.point) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {locationName || `${weatherData.point?.properties.relativeLocation.properties.city}, ${weatherData.point?.properties.relativeLocation.properties.state}`}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Change location
          </button>
        </div>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-sm font-medium text-red-800 dark:text-red-300">
                {alerts.length} Active Weather Alert{alerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          {[
            { id: 'current', label: 'Current' },
            { id: 'forecast', label: 'Forecast' },
            { id: 'hourly', label: 'Hourly' },
            { id: 'alerts', label: `Alerts ${alerts.length > 0 ? `(${alerts.length})` : ''}` },
            { id: 'details', label: 'Details' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'current' && (
          <div className="space-y-6">
            {/* Current Conditions */}
            {observation && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Current Observation</h3>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {currentPeriod && getWeatherIcon(currentPeriod.shortForecast, currentPeriod.isDaytime)}
                    <div className="ml-4">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {observation.temperature.value !== null
                          ? `${Math.round(weatherService.celsiusToFahrenheit(observation.temperature.value))}°F`
                          : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {observation.textDescription}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Droplets className="h-4 w-4 mr-1" />
                      Humidity
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {observation.relativeHumidity.value !== null
                        ? `${Math.round(observation.relativeHumidity.value)}%`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Wind className="h-4 w-4 mr-1" />
                      Wind
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {observation.windSpeed.value !== null
                        ? `${Math.round(weatherService.kphToMph(observation.windSpeed.value))} mph ${
                            observation.windDirection.value !== null
                              ? weatherService.getWindDirectionText(observation.windDirection.value)
                              : ''
                          }`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Gauge className="h-4 w-4 mr-1" />
                      Pressure
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {observation.barometricPressure.value !== null
                        ? `${(observation.barometricPressure.value / 100).toFixed(2)} mb`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Visibility
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {observation.visibility.value !== null
                        ? `${weatherService.metersToMiles(observation.visibility.value).toFixed(1)} mi`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Thermometer className="h-4 w-4 mr-1" />
                      Dewpoint
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {observation.dewpoint.value !== null
                        ? `${Math.round(weatherService.celsiusToFahrenheit(observation.dewpoint.value))}°F`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Thermometer className="h-4 w-4 mr-1" />
                      Feels Like
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {observation.heatIndex.value !== null
                        ? `${Math.round(weatherService.celsiusToFahrenheit(observation.heatIndex.value))}°F`
                        : observation.windChill.value !== null
                        ? `${Math.round(weatherService.celsiusToFahrenheit(observation.windChill.value))}°F`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Forecast */}
            {currentPeriod && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  {currentPeriod.name} Forecast
                </h3>
                <p className="text-gray-700 dark:text-gray-300">{currentPeriod.detailedForecast}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'forecast' && weatherData.forecast && (
          <div className="space-y-4">
            {weatherData.forecast.properties.periods.slice(0, 14).map((period: ForecastPeriod) => (
              <div
                key={period.number}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center flex-1">
                  <div className="text-gray-700 dark:text-gray-300">
                    {getWeatherIcon(period.shortForecast, period.isDaytime)}
                  </div>
                  <div className="ml-4">
                    <div className="font-medium text-gray-900 dark:text-white">{period.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{period.shortForecast}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {period.temperature}°{period.temperatureUnit}
                  </div>
                  {period.probabilityOfPrecipitation.value !== null && period.probabilityOfPrecipitation.value > 0 && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center justify-end mt-1">
                      <CloudRain className="h-4 w-4 mr-1" />
                      {period.probabilityOfPrecipitation.value}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'hourly' && weatherData.forecastHourly && (
          <div className="space-y-2">
            {weatherData.forecastHourly.properties.periods.slice(0, 24).map((period: ForecastPeriod) => (
              <div
                key={period.number}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white w-24">
                    {new Date(period.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      hour12: true
                    })}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 mx-3">
                    {getWeatherIcon(period.shortForecast, period.isDaytime)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {period.shortForecast}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {period.probabilityOfPrecipitation.value !== null && period.probabilityOfPrecipitation.value > 0 && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                      <CloudRain className="h-3 w-3 mr-1" />
                      {period.probabilityOfPrecipitation.value}%
                    </div>
                  )}
                  <div className="text-lg font-semibold text-gray-900 dark:text-white w-16 text-right">
                    {period.temperature}°{period.temperatureUnit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active weather alerts</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const props = alert.properties;
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${getSeverityColor(props.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        <h4 className="font-semibold">{props.event}</h4>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded uppercase">
                        {props.severity}
                      </span>
                    </div>
                    {props.headline && (
                      <p className="font-medium mb-2">{props.headline}</p>
                    )}
                    <p className="text-sm mb-2">{props.description}</p>
                    {props.instruction && (
                      <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded">
                        <p className="text-sm font-medium mb-1">Instructions:</p>
                        <p className="text-sm">{props.instruction}</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span>Effective: {new Date(props.effective).toLocaleString()}</span>
                      <span>Expires: {new Date(props.expires).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Station Info */}
            {weatherData.observationStations && weatherData.observationStations.features.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                  <Radio className="h-4 w-4 mr-2" />
                  Observation Station
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Station</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.observationStations.features[0].properties.stationIdentifier}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Name</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.observationStations.features[0].properties.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Elevation</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {Math.round(weatherData.observationStations.features[0].properties.elevation.value)} m
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Time Zone</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.observationStations.features[0].properties.timeZone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Radar Station */}
            {weatherData.radarStation && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                  <Radio className="h-4 w-4 mr-2" />
                  Radar Station
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Station ID</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.radarStation.properties.id}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Name</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.radarStation.properties.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Type</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.radarStation.properties.stationType}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Time Zone</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.radarStation.properties.timeZone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Point Info */}
            {weatherData.point && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Grid Point Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Grid ID</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.point.properties.gridId}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Grid X,Y</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.point.properties.gridX},{weatherData.point.properties.gridY}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Forecast Office</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.point.properties.cwa}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Time Zone</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {weatherData.point.properties.timeZone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Data Statistics */}
            {weatherData.forecastGridData && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Extended Forecast Data Available
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Detailed gridpoint data includes temperature, humidity, wind, precipitation probability,
                    snowfall, ice accumulation, visibility, wave heights, fire weather indices, and more.
                    This comprehensive dataset provides hourly values for multiple weather parameters.
                  </p>
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    Last updated: {new Date(weatherData.forecastGridData.properties.updateTime).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
