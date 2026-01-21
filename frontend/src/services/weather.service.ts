import axios from 'axios';
import type {
  Point,
  Forecast,
  ForecastGridData,
  Alerts,
  ObservationStations,
  Observation,
  RadarStation,
  WeatherData,
} from '../types/weather';

const NOAA_API_BASE = 'https://api.weather.gov';

const weatherApi = axios.create({
  baseURL: NOAA_API_BASE,
  headers: {
    'User-Agent': 'AdminDashboard/1.0 (homelab monitoring application)',
    Accept: 'application/geo+json',
  },
});

export const weatherService = {
  async getPoint(latitude: number, longitude: number): Promise<Point> {
    const response = await weatherApi.get<Point>(`/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`);
    return response.data;
  },

  async getForecast(forecastUrl: string): Promise<Forecast> {
    const response = await weatherApi.get<Forecast>(forecastUrl.replace(NOAA_API_BASE, ''));
    return response.data;
  },

  async getForecastHourly(forecastHourlyUrl: string): Promise<Forecast> {
    const response = await weatherApi.get<Forecast>(forecastHourlyUrl.replace(NOAA_API_BASE, ''));
    return response.data;
  },

  async getForecastGridData(forecastGridDataUrl: string): Promise<ForecastGridData> {
    const response = await weatherApi.get<ForecastGridData>(forecastGridDataUrl.replace(NOAA_API_BASE, ''));
    return response.data;
  },

  async getAlertsByPoint(point: string): Promise<Alerts> {
    const response = await weatherApi.get<Alerts>(`/alerts/active?point=${point}`);
    return response.data;
  },

  async getAlertsByState(state: string): Promise<Alerts> {
    const response = await weatherApi.get<Alerts>(`/alerts/active?area=${state}`);
    return response.data;
  },

  async getObservationStations(stationsUrl: string): Promise<ObservationStations> {
    const response = await weatherApi.get<ObservationStations>(stationsUrl.replace(NOAA_API_BASE, ''));
    return response.data;
  },

  async getLatestObservation(stationId: string): Promise<Observation> {
    const response = await weatherApi.get<Observation>(`/stations/${stationId}/observations/latest`);
    return response.data;
  },

  async getRadarStation(radarStationId: string): Promise<RadarStation> {
    const response = await weatherApi.get<RadarStation>(`/radar/stations/${radarStationId}`);
    return response.data;
  },

  async getComprehensiveWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const point = await this.getPoint(latitude, longitude);

      const [
        forecast,
        forecastHourly,
        forecastGridData,
        alerts,
        observationStations,
      ] = await Promise.allSettled([
        this.getForecast(point.properties.forecast),
        this.getForecastHourly(point.properties.forecastHourly),
        this.getForecastGridData(point.properties.forecastGridData),
        this.getAlertsByPoint(`${latitude.toFixed(4)},${longitude.toFixed(4)}`),
        this.getObservationStations(point.properties.observationStations),
      ]);

      let latestObservation: Observation | null = null;
      if (observationStations.status === 'fulfilled' && observationStations.value.features.length > 0) {
        const nearestStationId = observationStations.value.features[0].properties.stationIdentifier;
        try {
          latestObservation = await this.getLatestObservation(nearestStationId);
        } catch (error) {
          console.error('Failed to fetch latest observation:', error);
        }
      }

      let radarStation: RadarStation | null = null;
      if (point.properties.radarStation) {
        try {
          radarStation = await this.getRadarStation(point.properties.radarStation);
        } catch (error) {
          console.error('Failed to fetch radar station:', error);
        }
      }

      return {
        point,
        forecast: forecast.status === 'fulfilled' ? forecast.value : null,
        forecastHourly: forecastHourly.status === 'fulfilled' ? forecastHourly.value : null,
        forecastGridData: forecastGridData.status === 'fulfilled' ? forecastGridData.value : null,
        alerts: alerts.status === 'fulfilled' ? alerts.value : null,
        observationStations: observationStations.status === 'fulfilled' ? observationStations.value : null,
        latestObservation,
        radarStation,
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  },

  celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
  },

  kphToMph(kph: number): number {
    return kph * 0.621371;
  },

  metersToMiles(meters: number): number {
    return meters * 0.000621371;
  },

  getWindDirectionText(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  },
};
