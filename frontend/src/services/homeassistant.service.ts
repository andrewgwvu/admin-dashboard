import axios, { AxiosInstance } from 'axios';
import type {
  HAConfig,
  HAEntityState,
  HALight,
  HAServiceCall,
  HAServiceResponse,
  HAArea,
  HADevice,
  HAEntityRegistry,
} from '../types/homeassistant';

class HomeAssistantService {
  private api: AxiosInstance | null = null;
  private config: HAConfig | null = null;

  configure(config: HAConfig) {
    this.config = config;
    this.api = axios.create({
      baseURL: config.url,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  isConfigured(): boolean {
    return this.api !== null && this.config !== null;
  }

  getConfig(): HAConfig | null {
    return this.config;
  }

  private ensureConfigured() {
    if (!this.api) {
      throw new Error('HomeAssistant service not configured. Call configure() first.');
    }
  }

  async testConnection(): Promise<boolean> {
    this.ensureConfigured();
    try {
      await this.api!.get('/api/');
      return true;
    } catch (error) {
      console.error('HomeAssistant connection test failed:', error);
      return false;
    }
  }

  async getStates(): Promise<HAEntityState[]> {
    this.ensureConfigured();
    const response = await this.api!.get<HAEntityState[]>('/api/states');
    return response.data;
  }

  async getState(entityId: string): Promise<HAEntityState> {
    this.ensureConfigured();
    const response = await this.api!.get<HAEntityState>(`/api/states/${entityId}`);
    return response.data;
  }

  async getLights(): Promise<HALight[]> {
    this.ensureConfigured();
    const states = await this.getStates();
    return states.filter((state) => state.entity_id.startsWith('light.')) as HALight[];
  }

  async callService(serviceCall: HAServiceCall): Promise<HAServiceResponse[]> {
    this.ensureConfigured();
    const { domain, service, service_data } = serviceCall;
    const response = await this.api!.post<HAServiceResponse[]>(
      `/api/services/${domain}/${service}`,
      service_data
    );
    return response.data;
  }

  async turnOnLight(entityId: string, options?: {
    brightness?: number;
    rgb_color?: [number, number, number];
    color_temp?: number;
    transition?: number;
  }): Promise<HAServiceResponse[]> {
    return this.callService({
      domain: 'light',
      service: 'turn_on',
      service_data: {
        entity_id: entityId,
        ...options,
      },
    });
  }

  async turnOffLight(entityId: string, transition?: number): Promise<HAServiceResponse[]> {
    return this.callService({
      domain: 'light',
      service: 'turn_off',
      service_data: {
        entity_id: entityId,
        ...(transition !== undefined && { transition }),
      },
    });
  }

  async toggleLight(entityId: string): Promise<HAServiceResponse[]> {
    return this.callService({
      domain: 'light',
      service: 'toggle',
      service_data: {
        entity_id: entityId,
      },
    });
  }

  async setBrightness(entityId: string, brightness: number): Promise<HAServiceResponse[]> {
    return this.turnOnLight(entityId, { brightness });
  }

  async setRgbColor(entityId: string, rgb: [number, number, number]): Promise<HAServiceResponse[]> {
    return this.turnOnLight(entityId, { rgb_color: rgb });
  }

  async setColorTemp(entityId: string, colorTemp: number): Promise<HAServiceResponse[]> {
    return this.turnOnLight(entityId, { color_temp: colorTemp });
  }

  async getAreas(): Promise<HAArea[]> {
    this.ensureConfigured();
    const response = await this.api!.get<HAArea[]>('/api/config/area_registry/list');
    return response.data;
  }

  async getDevices(): Promise<HADevice[]> {
    this.ensureConfigured();
    const response = await this.api!.get<HADevice[]>('/api/config/device_registry/list');
    return response.data;
  }

  async getEntityRegistry(): Promise<HAEntityRegistry[]> {
    this.ensureConfigured();
    const response = await this.api!.get<HAEntityRegistry[]>('/api/config/entity_registry/list');
    return response.data;
  }

  async getLightsByArea(): Promise<Map<string, HALight[]>> {
    this.ensureConfigured();
    const [lights, entityRegistry, areas] = await Promise.all([
      this.getLights(),
      this.getEntityRegistry(),
      this.getAreas(),
    ]);

    const areaMap = new Map<string, string>();
    areas.forEach((area) => {
      areaMap.set(area.area_id, area.name);
    });

    const lightsByArea = new Map<string, HALight[]>();
    lightsByArea.set('unassigned', []);

    lights.forEach((light) => {
      const registryEntry = entityRegistry.find((e) => e.entity_id === light.entity_id);
      const areaId = registryEntry?.area_id;

      if (areaId && areaMap.has(areaId)) {
        const areaName = areaMap.get(areaId)!;
        if (!lightsByArea.has(areaName)) {
          lightsByArea.set(areaName, []);
        }
        lightsByArea.get(areaName)!.push(light);
      } else {
        lightsByArea.get('unassigned')!.push(light);
      }
    });

    // Remove unassigned if empty
    if (lightsByArea.get('unassigned')!.length === 0) {
      lightsByArea.delete('unassigned');
    }

    return lightsByArea;
  }

  rgbToHex(rgb: [number, number, number]): string {
    return '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
  }

  hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      throw new Error('Invalid hex color');
    }
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }
}

export const homeAssistantService = new HomeAssistantService();
