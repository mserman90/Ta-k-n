import { create } from 'zustand';
import { floodApi, overpassApi, weatherApi, rainViewerApi } from '../services/api';

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  basin: string;
  dangerThreshold: number;
  currentDischarge?: number;
  isDanger?: boolean;
}

export interface Measurement {
  timestamp: string;
  discharge: number; // m³/s
  isForecast?: boolean;
}

export interface InfrastructureNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  type: string;
}

export interface WeatherData {
  temperature: number;
  precipitation: number;
}

export interface AlertNotification {
  id: string;
  stationId: string;
  stationName: string;
  discharge: number;
  threshold: number;
  timestamp: number;
}

interface FloodState {
  stations: Station[];
  selectedStation: Station | null;
  stationData: Measurement[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Infrastructure Layer
  showInfrastructure: boolean;
  infrastructureData: InfrastructureNode[];
  isLoadingInfrastructure: boolean;
  
  // Weather Layer
  weatherMode: boolean;
  weatherLocation: { lat: number, lon: number } | null;
  weatherData: WeatherData | null;
  isLoadingWeather: boolean;

  // Alerts
  alerts: AlertNotification[];

  // Radar Layer
  radarMode: boolean;
  radarTileUrl: string | null;

  fetchStations: () => Promise<void>;
  refreshData: () => Promise<void>;
  selectStation: (station: Station, isRefresh?: boolean) => Promise<void>;
  toggleInfrastructure: () => void;
  fetchInfrastructure: (bbox: [number, number, number, number]) => Promise<void>;
  toggleWeatherMode: () => void;
  fetchWeather: (lat: number, lon: number) => Promise<void>;
  clearWeather: () => void;
  dismissAlert: (id: string) => void;
  toggleRadarMode: () => void;
  fetchRadarData: () => Promise<void>;
}

// Predefined major river stations in Turkey and connected transboundary rivers for Open-Meteo API
const REGIONAL_STATIONS: Station[] = [
  // Turkey Internal
  { id: '1', name: 'Kızılırmak (Bafra)', latitude: 41.56, longitude: 35.90, basin: 'Kızılırmak Havzası', dangerThreshold: 150 },
  { id: '2', name: 'Sakarya (Adapazarı)', latitude: 40.78, longitude: 30.40, basin: 'Sakarya Havzası', dangerThreshold: 120 },
  { id: '6', name: 'Yeşilırmak (Çarşamba)', latitude: 41.20, longitude: 36.62, basin: 'Yeşilırmak Havzası', dangerThreshold: 130 },
  { id: '7', name: 'Seyhan (Adana)', latitude: 36.98, longitude: 35.32, basin: 'Seyhan Havzası', dangerThreshold: 200 },
  { id: '8', name: 'Büyük Menderes (Aydın)', latitude: 37.75, longitude: 27.40, basin: 'Büyük Menderes Havzası', dangerThreshold: 90 },
  
  // Transboundary (Turkey)
  { id: '3', name: 'Fırat (Birecik, TR)', latitude: 37.02, longitude: 37.98, basin: 'Fırat-Dicle Havzası', dangerThreshold: 400 },
  { id: '4', name: 'Dicle (Diyarbakır, TR)', latitude: 37.91, longitude: 40.23, basin: 'Fırat-Dicle Havzası', dangerThreshold: 300 },
  { id: '5', name: 'Meriç (Edirne, TR)', latitude: 41.67, longitude: 26.56, basin: 'Meriç-Ergene Havzası', dangerThreshold: 250 },
  { id: '9', name: 'Asi (Hatay, TR)', latitude: 36.20, longitude: 36.16, basin: 'Asi Havzası', dangerThreshold: 100 },

  // Transboundary (Neighboring Countries)
  { id: '10', name: 'Maritsa/Meriç (Svilengrad, BG)', latitude: 41.76, longitude: 26.20, basin: 'Meriç-Ergene Havzası', dangerThreshold: 200 },
  { id: '11', name: 'Orontes/Asi (Homs, SY)', latitude: 34.73, longitude: 36.71, basin: 'Asi Havzası', dangerThreshold: 80 },
  { id: '12', name: 'Euphrates/Fırat (Raqqa, SY)', latitude: 35.94, longitude: 39.01, basin: 'Fırat-Dicle Havzası', dangerThreshold: 500 },
  { id: '13', name: 'Tigris/Dicle (Mosul, IQ)', latitude: 36.34, longitude: 43.13, basin: 'Fırat-Dicle Havzası', dangerThreshold: 400 },
  { id: '14', name: 'Kura (Tbilisi, GE)', latitude: 41.71, longitude: 44.82, basin: 'Kura-Aras Havzası', dangerThreshold: 300 },
  { id: '15', name: 'Aras (Yerevan Sınırı, AM)', latitude: 40.05, longitude: 44.44, basin: 'Kura-Aras Havzası', dangerThreshold: 150 },
];

export const useFloodStore = create<FloodState>((set, get) => ({
  stations: [],
  selectedStation: null,
  stationData: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  showInfrastructure: false,
  infrastructureData: [],
  isLoadingInfrastructure: false,

  weatherMode: false,
  weatherLocation: null,
  weatherData: null,
  isLoadingWeather: false,

  alerts: [],

  radarMode: false,
  radarTileUrl: null,

  toggleInfrastructure: () => set((state) => ({ showInfrastructure: !state.showInfrastructure })),

  fetchInfrastructure: async (bbox: [number, number, number, number]) => {
    const { showInfrastructure } = get();
    if (!showInfrastructure) return;
    
    set({ isLoadingInfrastructure: true });
    try {
      const [s, w, n, e] = bbox;
      const data = await overpassApi.getWaterInfrastructure(s, w, n, e);
      
      if (data && data.elements) {
        const nodes: InfrastructureNode[] = data.elements.map((el: any) => ({
          id: el.id,
          lat: el.lat || el.center?.lat,
          lon: el.lon || el.center?.lon,
          tags: el.tags || {},
          type: el.type
        })).filter((n: InfrastructureNode) => n.lat && n.lon);
        
        set({ infrastructureData: nodes, isLoadingInfrastructure: false });
      } else {
        set({ isLoadingInfrastructure: false });
      }
    } catch (err) {
      console.error("Failed to fetch infrastructure:", err);
      set({ isLoadingInfrastructure: false });
    }
  },

  toggleWeatherMode: () => set((state) => ({ 
    weatherMode: !state.weatherMode,
    weatherLocation: !state.weatherMode ? state.weatherLocation : null,
    weatherData: !state.weatherMode ? state.weatherData : null
  })),

  clearWeather: () => set({ weatherLocation: null, weatherData: null }),

  dismissAlert: (id: string) => set((state) => ({ alerts: state.alerts.filter(a => a.id !== id) })),

  toggleRadarMode: () => {
    const { radarMode, fetchRadarData } = get();
    if (!radarMode) {
      fetchRadarData();
    }
    set({ radarMode: !radarMode });
  },

  fetchRadarData: async () => {
    try {
      const data = await rainViewerApi.getRadarMetadata();
      if (data && data.host && data.radar && data.radar.past && data.radar.past.length > 0) {
        const latest = data.radar.past[data.radar.past.length - 1];
        // format: {host}{path}/256/{z}/{x}/{y}/2/1_1.png
        // 2 = standard color scheme, 1_1 = smooth with snow
        const tileUrl = `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
        set({ radarTileUrl: tileUrl });
      }
    } catch (err) {
      console.error("Failed to fetch radar metadata:", err);
    }
  },

  fetchWeather: async (lat: number, lon: number) => {
    set({ isLoadingWeather: true, weatherLocation: { lat, lon }, weatherData: null });
    try {
      const data = await weatherApi.getCurrentWeather(lat, lon);
      if (data && data.current) {
        set({
          weatherData: {
            temperature: data.current.temperature_2m,
            precipitation: data.current.precipitation
          },
          isLoadingWeather: false
        });
      } else {
        set({ isLoadingWeather: false });
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
      set({ isLoadingWeather: false });
    }
  },

  refreshData: async () => {
    const { fetchStations, selectedStation, selectStation, radarMode, fetchRadarData } = get();
    await fetchStations();
    if (selectedStation) {
      await selectStation(selectedStation, true);
    }
    if (radarMode) {
      await fetchRadarData();
    }
  },

  fetchStations: async () => {
    const previousDangerIds = new Set(get().stations.filter(s => s.isDanger).map(s => s.id));
    set({ isLoading: true, error: null });
    
    // Set initial stations immediately so map can render
    set({ stations: REGIONAL_STATIONS });

    try {
      // Fetch current discharge for all stations in parallel to determine danger status
      const updatedStations = await Promise.all(REGIONAL_STATIONS.map(async (station) => {
        try {
          const data = await floodApi.getCurrentDischarge(station.latitude, station.longitude);
          if (data && data.daily && data.daily.river_discharge) {
            const discharges = data.daily.river_discharge;
            // Get the most recent non-null value
            const currentDischarge = discharges[discharges.length - 1] || 0;
            return {
              ...station,
              currentDischarge: Number(currentDischarge.toFixed(2)),
              isDanger: currentDischarge >= station.dangerThreshold
            };
          }
        } catch (err) {
          console.error(`Failed to fetch current status for ${station.name}`, err);
        }
        return station;
      }));

      const newAlerts: AlertNotification[] = [];
      updatedStations.forEach(station => {
        if (station.isDanger && !previousDangerIds.has(station.id)) {
          newAlerts.push({
            id: Math.random().toString(36).substring(7),
            stationId: station.id,
            stationName: station.name,
            discharge: station.currentDischarge!,
            threshold: station.dangerThreshold,
            timestamp: Date.now()
          });
        }
      });

      set((state) => ({ 
        stations: updatedStations, 
        isLoading: false,
        alerts: [...state.alerts, ...newAlerts]
      }));
    } catch (err) {
      console.error("Failed to update station statuses:", err);
      set({ isLoading: false });
    }
  },

  selectStation: async (station: Station, isRefresh = false) => {
    if (!isRefresh) {
      set({ selectedStation: station, isLoading: true, error: null, stationData: [], lastUpdated: null });
    }
    try {
      const data = await floodApi.getStationData(station.latitude, station.longitude);
      
      // Open-Meteo returns { daily: { time: string[], river_discharge: number[] } }
      if (!data || !data.daily || !data.daily.time || !data.daily.river_discharge) {
        throw new Error("Invalid data format from API");
      }

      const measurements: Measurement[] = data.daily.time.map((timeStr: string, index: number) => {
        const discharge = data.daily.river_discharge[index];
        const date = new Date(timeStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return {
          timestamp: timeStr,
          discharge: discharge !== null ? Number(discharge.toFixed(2)) : 0,
          isForecast: date > today
        };
      });

      set({ stationData: measurements, isLoading: false, lastUpdated: new Date().toISOString() });
    } catch (err: any) {
      console.error(`Failed to fetch data for station ${station.id}:`, err);
      set({ 
        stationData: [], 
        error: "Veri mevcut değil (Data not available)", 
        isLoading: false,
        lastUpdated: null
      });
    }
  }
}));
