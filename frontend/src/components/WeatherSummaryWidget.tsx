import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud,
  AlertTriangle,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { weatherService } from '../services/weather.service';
import type { WeatherData } from '../types/weather';

export default function WeatherSummaryWidget() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');

  useEffect(() => {
    const loadWeatherData = async () => {
      setLoading(true);
      try {
        // Check for saved location data in localStorage
        const savedZipCode = localStorage.getItem('weather_zipcode');
        const savedLat = localStorage.getItem('weather_lat');
        const savedLon = localStorage.getItem('weather_lon');
        const savedLocationName = localStorage.getItem('weather_location_name');

        if (savedLocationName) {
          setLocationName(savedLocationName);
        }

        if (savedZipCode) {
          const result = await weatherService.getCoordinatesFromZipCode(savedZipCode);
          const data = await weatherService.getComprehensiveWeatherData(result.latitude, result.longitude);
          setWeatherData(data);
        } else if (savedLat && savedLon) {
          const lat = parseFloat(savedLat);
          const lon = parseFloat(savedLon);
          const data = await weatherService.getComprehensiveWeatherData(lat, lon);
          setWeatherData(data);
        }
      } catch (err) {
        console.error('Failed to load weather summary:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWeatherData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <Link
        to="/weather"
        className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg hover:scale-105 transition-all duration-200 block"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Cloud className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Weather</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure your location</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
      </Link>
    );
  }

  const currentPeriod = weatherData.forecast?.properties.periods[0];
  const observation = weatherData.latestObservation?.properties;
  const alerts = weatherData.alerts?.features || [];
  const activeAlerts = alerts.filter(a => a.properties.status === 'Actual');

  const temperature = observation?.temperature.value !== null && observation?.temperature.value !== undefined
    ? Math.round(weatherService.celsiusToFahrenheit(observation.temperature.value))
    : currentPeriod?.temperature || null;

  return (
    <Link
      to="/weather"
      className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg hover:scale-105 transition-all duration-200 block"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <Cloud className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Weather</h3>
            {locationName && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {locationName}
              </div>
            )}
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400" />
      </div>

      <div className="space-y-4">
        {/* Current Temperature */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {temperature ? `${temperature}°F` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentPeriod?.shortForecast || observation?.textDescription || 'No data'}
            </div>
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Humidity</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {observation?.relativeHumidity.value !== null && observation?.relativeHumidity.value !== undefined
                ? `${Math.round(observation.relativeHumidity.value)}%`
                : currentPeriod?.relativeHumidity.value !== null && currentPeriod?.relativeHumidity.value !== undefined
                ? `${Math.round(currentPeriod.relativeHumidity.value)}%`
                : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Wind</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {observation?.windSpeed.value !== null && observation?.windSpeed.value !== undefined
                ? `${Math.round(weatherService.kphToMph(observation.windSpeed.value))} mph`
                : currentPeriod?.windSpeed || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Alerts</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
              {activeAlerts.length > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                  {activeAlerts.length}
                </>
              ) : (
                'None'
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
