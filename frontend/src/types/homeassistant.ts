// HomeAssistant API Types

export interface HAConfig {
  url: string;
  accessToken: string;
}

export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    brightness?: number;
    color_temp?: number;
    rgb_color?: [number, number, number];
    hs_color?: [number, number];
    xy_color?: [number, number];
    color_mode?: string;
    supported_color_modes?: string[];
    supported_features?: number;
    icon?: string;
    unit_of_measurement?: string;
    device_class?: string;
    [key: string]: any;
  };
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HALight extends HAEntityState {
  attributes: HAEntityState['attributes'] & {
    brightness?: number;
    color_temp?: number;
    rgb_color?: [number, number, number];
    hs_color?: [number, number];
    xy_color?: [number, number];
    color_mode?: string;
    supported_color_modes?: string[];
    min_mireds?: number;
    max_mireds?: number;
  };
}

export interface HAServiceCall {
  domain: string;
  service: string;
  service_data?: {
    entity_id?: string | string[];
    brightness?: number;
    rgb_color?: [number, number, number];
    color_temp?: number;
    transition?: number;
    [key: string]: any;
  };
}

export interface HAServiceResponse {
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
}

export interface HADevice {
  id: string;
  name: string;
  area_id: string | null;
  manufacturer?: string;
  model?: string;
  sw_version?: string;
}

export interface HAEntityRegistry {
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  device_id: string | null;
  area_id: string | null;
  disabled_by: string | null;
  hidden_by: string | null;
  entity_category: string | null;
  has_entity_name: boolean;
  original_name: string | null;
}
