// NOAA/NWS Weather API Types

export interface Point {
  '@context': any;
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    '@id': string;
    '@type': string;
    cwa: string;
    forecastOffice: string;
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    relativeLocation: {
      type: string;
      geometry: {
        type: string;
        coordinates: [number, number];
      };
      properties: {
        city: string;
        state: string;
        distance: {
          unitCode: string;
          value: number;
        };
        bearing: {
          unitCode: string;
          value: number;
        };
      };
    };
    forecastZone: string;
    county: string;
    fireWeatherZone: string;
    timeZone: string;
    radarStation: string;
  };
}

export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  probabilityOfPrecipitation: {
    unitCode: string;
    value: number | null;
  };
  dewpoint: {
    unitCode: string;
    value: number | null;
  };
  relativeHumidity: {
    unitCode: string;
    value: number | null;
  };
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface Forecast {
  '@context': any;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  properties: {
    updated: string;
    units: string;
    forecastGenerator: string;
    generatedAt: string;
    updateTime: string;
    validTimes: string;
    elevation: {
      unitCode: string;
      value: number;
    };
    periods: ForecastPeriod[];
  };
}

export interface GridpointValue {
  validTime: string;
  value: number | null;
}

export interface ForecastGridData {
  '@context': any;
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number][][];
  };
  properties: {
    '@id': string;
    '@type': string;
    updateTime: string;
    validTimes: string;
    elevation: {
      unitCode: string;
      value: number;
    };
    forecastOffice: string;
    gridId: string;
    gridX: string;
    gridY: string;
    temperature: {
      uom: string;
      values: GridpointValue[];
    };
    dewpoint: {
      uom: string;
      values: GridpointValue[];
    };
    maxTemperature: {
      uom: string;
      values: GridpointValue[];
    };
    minTemperature: {
      uom: string;
      values: GridpointValue[];
    };
    relativeHumidity: {
      uom: string;
      values: GridpointValue[];
    };
    apparentTemperature: {
      uom: string;
      values: GridpointValue[];
    };
    heatIndex: {
      uom: string;
      values: GridpointValue[];
    };
    windChill: {
      uom: string;
      values: GridpointValue[];
    };
    skyCover: {
      uom: string;
      values: GridpointValue[];
    };
    windDirection: {
      uom: string;
      values: GridpointValue[];
    };
    windSpeed: {
      uom: string;
      values: GridpointValue[];
    };
    windGust: {
      uom: string;
      values: GridpointValue[];
    };
    weather: {
      values: {
        validTime: string;
        value: {
          weather: string | null;
          intensity: string | null;
          coverage: string | null;
          attributes: string[];
        }[];
      }[];
    };
    hazards: {
      values: {
        validTime: string;
        value: {
          phenomenon: string;
          significance: string;
          event_number: number | null;
        }[];
      }[];
    };
    probabilityOfPrecipitation: {
      uom: string;
      values: GridpointValue[];
    };
    quantitativePrecipitation: {
      uom: string;
      values: GridpointValue[];
    };
    iceAccumulation: {
      uom: string;
      values: GridpointValue[];
    };
    snowfallAmount: {
      uom: string;
      values: GridpointValue[];
    };
    snowLevel: {
      uom: string;
      values: GridpointValue[];
    };
    ceilingHeight: {
      uom: string;
      values: GridpointValue[];
    };
    visibility: {
      uom: string;
      values: GridpointValue[];
    };
    transportWindSpeed: {
      uom: string;
      values: GridpointValue[];
    };
    transportWindDirection: {
      uom: string;
      values: GridpointValue[];
    };
    mixingHeight: {
      uom: string;
      values: GridpointValue[];
    };
    hainesIndex: {
      values: GridpointValue[];
    };
    lightningActivityLevel: {
      values: GridpointValue[];
    };
    twentyFootWindSpeed: {
      uom: string;
      values: GridpointValue[];
    };
    twentyFootWindDirection: {
      uom: string;
      values: GridpointValue[];
    };
    waveHeight: {
      uom: string;
      values: GridpointValue[];
    };
    wavePeriod: {
      uom: string;
      values: GridpointValue[];
    };
    waveDirection: {
      uom: string;
      values: GridpointValue[];
    };
    primarySwellHeight: {
      uom: string;
      values: GridpointValue[];
    };
    primarySwellDirection: {
      uom: string;
      values: GridpointValue[];
    };
    secondarySwellHeight: {
      uom: string;
      values: GridpointValue[];
    };
    secondarySwellDirection: {
      uom: string;
      values: GridpointValue[];
    };
    wavePeriod2: {
      uom: string;
      values: GridpointValue[];
    };
    windWaveHeight: {
      uom: string;
      values: GridpointValue[];
    };
    dispersionIndex: {
      values: GridpointValue[];
    };
    pressure: {
      uom: string;
      values: GridpointValue[];
    };
    probabilityOfTropicalStormWinds: {
      uom: string;
      values: GridpointValue[];
    };
    probabilityOfHurricaneWinds: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf15mphWinds: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf25mphWinds: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf35mphWinds: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf45mphWinds: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf20mphWindGusts: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf30mphWindGusts: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf40mphWindGusts: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf50mphWindGusts: {
      uom: string;
      values: GridpointValue[];
    };
    potentialOf60mphWindGusts: {
      uom: string;
      values: GridpointValue[];
    };
    grasslandFireDangerIndex: {
      values: GridpointValue[];
    };
    probabilityOfThunder: {
      uom: string;
      values: GridpointValue[];
    };
    davisStabilityIndex: {
      values: GridpointValue[];
    };
    atmosphericDispersionIndex: {
      values: GridpointValue[];
    };
    lowVisibilityOccurrenceRiskIndex: {
      values: GridpointValue[];
    };
    stability: {
      values: GridpointValue[];
    };
    redFlagThreatIndex: {
      values: GridpointValue[];
    };
  };
}

export interface WeatherAlert {
  id: string;
  areaDesc: string;
  geocode: {
    SAME: string[];
    UGC: string[];
  };
  affectedZones: string[];
  references: {
    '@id': string;
    identifier: string;
    sender: string;
    sent: string;
  }[];
  sent: string;
  effective: string;
  onset: string;
  expires: string;
  ends: string | null;
  status: string;
  messageType: string;
  category: string;
  severity: string;
  certainty: string;
  urgency: string;
  event: string;
  sender: string;
  senderName: string;
  headline: string | null;
  description: string;
  instruction: string | null;
  response: string;
  parameters: {
    AWIPSidentifier?: string[];
    WMOidentifier?: string[];
    NWSheadline?: string[];
    BLOCKCHANNEL?: string[];
    VTEC?: string[];
    eventEndingTime?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface Alerts {
  '@context': any;
  type: string;
  features: {
    id: string;
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    } | null;
    properties: WeatherAlert;
  }[];
  title: string;
  updated: string;
}

export interface ObservationStation {
  '@id': string;
  '@type': string;
  elevation: {
    unitCode: string;
    value: number;
  };
  stationIdentifier: string;
  name: string;
  timeZone: string;
  forecast: string;
  county: string;
  fireWeatherZone: string;
}

export interface ObservationStations {
  '@context': any;
  type: string;
  features: {
    id: string;
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: ObservationStation;
  }[];
  observationStations: string[];
}

export interface Observation {
  '@context': any;
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    '@id': string;
    '@type': string;
    elevation: {
      unitCode: string;
      value: number;
    };
    station: string;
    timestamp: string;
    rawMessage: string;
    textDescription: string;
    icon: string | null;
    presentWeather: any[];
    temperature: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    dewpoint: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    windDirection: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    windSpeed: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    windGust: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    barometricPressure: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    seaLevelPressure: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    visibility: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    maxTemperatureLast24Hours: {
      unitCode: string;
      value: number | null;
    };
    minTemperatureLast24Hours: {
      unitCode: string;
      value: number | null;
    };
    precipitationLastHour: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    precipitationLast3Hours: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    precipitationLast6Hours: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    relativeHumidity: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    windChill: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    heatIndex: {
      unitCode: string;
      value: number | null;
      qualityControl: string;
    };
    cloudLayers: {
      base: {
        unitCode: string;
        value: number | null;
      };
      amount: string;
    }[];
  };
}

export interface RadarStation {
  '@context': any;
  '@id': string;
  '@type': string;
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    '@id': string;
    '@type': string;
    id: string;
    name: string;
    stationType: string;
    timeZone: string;
    latency: {
      level2: number | null;
      level3: number | null;
    };
    rda: {
      properties: {
        id: string;
      };
    };
  };
}

export interface WeatherData {
  point: Point | null;
  forecast: Forecast | null;
  forecastHourly: Forecast | null;
  forecastGridData: ForecastGridData | null;
  alerts: Alerts | null;
  observationStations: ObservationStations | null;
  latestObservation: Observation | null;
  radarStation: RadarStation | null;
}
