import WeatherWidget from '../components/WeatherWidget';

export default function WeatherPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Weather</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Comprehensive weather information from NOAA/NWS
        </p>
      </div>

      <WeatherWidget />
    </div>
  );
}
