import { create } from 'zustand';
import { floodApi } from '../services/api';

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

interface FloodState {
  stations: Station[];
  selectedStation: Station | null;
  stationData: Measurement[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  fetchStations: () => Promise<void>;
  selectStation: (station: Station) => Promise<void>;
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

  fetchStations: async () => {
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

      set({ stations: updatedStations, isLoading: false });
    } catch (err) {
      console.error("Failed to update station statuses:", err);
      set({ isLoading: false });
    }
  },

  selectStation: async (station: Station) => {
    set({ selectedStation: station, isLoading: true, error: null, stationData: [], lastUpdated: null });
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
