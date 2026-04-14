import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useFloodStore, Station } from '../store/useFloodStore';
import { Layers, CloudRain, Thermometer, Droplets, Radar } from 'lucide-react';
import L from 'leaflet';

// Dynamic custom icon generator
const getCustomIcon = (isDanger?: boolean) => new L.DivIcon({
  html: `<div style="color: ${isDanger ? '#dc2626' : '#2563eb'}; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${isDanger ? '#fee2e2' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
         </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function MapUpdater({ selectedStation }: { selectedStation: Station | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedStation) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 8, {
        duration: 1.5
      });
    }
  }, [selectedStation, map]);
  return null;
}

function WeatherLayer() {
  const { weatherMode, weatherLocation, weatherData, isLoadingWeather, fetchWeather, clearWeather } = useFloodStore();

  useMapEvents({
    click: (e) => {
      if (weatherMode) {
        fetchWeather(e.latlng.lat, e.latlng.lng);
      }
    }
  });

  if (!weatherMode || !weatherLocation) return null;

  return (
    <Popup 
      position={[weatherLocation.lat, weatherLocation.lon]} 
      eventHandlers={{ remove: clearWeather }}
    >
      <div className="p-2 min-w-[150px]">
        <h3 className="font-bold text-gray-900 m-0 mb-2 flex items-center gap-1">
          <CloudRain size={16} className="text-blue-500" />
          Hava Durumu
        </h3>
        {isLoadingWeather ? (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : weatherData ? (
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-gray-600">
                <Thermometer size={14} />
                <span className="text-sm">Sıcaklık:</span>
              </div>
              <span className="text-sm font-semibold">{weatherData.temperature} °C</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-gray-600">
                <Droplets size={14} />
                <span className="text-sm">Yağış:</span>
              </div>
              <span className="text-sm font-semibold">{weatherData.precipitation} mm</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-500">Veri alınamadı.</p>
        )}
      </div>
    </Popup>
  );
}

function InfrastructureLayer() {
  const { showInfrastructure, infrastructureData, fetchInfrastructure } = useFloodStore();
  const map = useMap();

  const updateInfrastructure = useCallback(() => {
    if (!showInfrastructure) return;
    const zoom = map.getZoom();
    if (zoom >= 8) {
      const bounds = map.getBounds();
      fetchInfrastructure([
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast()
      ]);
    }
  }, [map, showInfrastructure, fetchInfrastructure]);

  useMapEvents({
    moveend: updateInfrastructure,
    zoomend: updateInfrastructure,
  });

  // Initial fetch when toggled on
  useEffect(() => {
    if (showInfrastructure) {
      updateInfrastructure();
    }
  }, [showInfrastructure, updateInfrastructure]);

  if (!showInfrastructure) return null;

  return (
    <>
      {infrastructureData.map((node) => (
        <CircleMarker
          key={`infra-${node.type}-${node.id}`}
          center={[node.lat, node.lon]}
          radius={6}
          pathOptions={{ color: '#0369a1', fillColor: '#38bdf8', fillOpacity: 0.7, weight: 2 }}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-bold text-gray-900 m-0">
                {node.tags.name || 'İsimsiz Su Altyapısı'}
              </h3>
              <p className="text-sm text-gray-600 m-0 mt-1 capitalize">
                Tip: {node.tags.waterway === 'dam' ? 'Baraj (Dam)' : node.tags.man_made === 'water_works' ? 'Su Tesisi' : 'Altyapı'}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export default function FloodMap() {
  const { 
    stations, selectedStation, selectStation, 
    showInfrastructure, toggleInfrastructure, isLoadingInfrastructure,
    weatherMode, toggleWeatherMode,
    radarMode, toggleRadarMode, radarTileUrl
  } = useFloodStore();

  const center: [number, number] = [38.9637, 38.2433]; // Shifted slightly east to cover neighbors better

  return (
    <div className="w-full h-full relative z-0">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={toggleRadarMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-md font-medium transition-colors ${
            radarMode 
              ? 'bg-purple-600 text-white hover:bg-purple-700' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="Canlı Yağış Radarı"
        >
          <Radar size={18} />
          <span>Yağış Radarı</span>
        </button>

        <button
          onClick={toggleInfrastructure}
          className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-md font-medium transition-colors ${
            showInfrastructure 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Layers size={18} />
          <span>Su Altyapıları</span>
          {isLoadingInfrastructure && (
            <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin ml-1" />
          )}
        </button>

        <button
          onClick={toggleWeatherMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-md font-medium transition-colors ${
            weatherMode 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title="Haritada tıklanan yerin hava durumunu gösterir"
        >
          <CloudRain size={18} />
          <span>Hava Durumu (Tıkla)</span>
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        className={weatherMode ? 'cursor-crosshair' : ''}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {radarMode && radarTileUrl && (
          <TileLayer
            url={radarTileUrl}
            opacity={0.6}
            zIndex={10}
            attribution='&copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
          />
        )}

        <MapUpdater selectedStation={selectedStation} />
        <InfrastructureLayer />
        <WeatherLayer />

        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={getCustomIcon(station.isDanger)}
            eventHandlers={{
              click: () => selectStation(station),
            }}
          >
            {selectedStation?.id === station.id && (
              <Popup eventHandlers={{ remove: () => useFloodStore.setState({ selectedStation: null }) }}>
                <div className="p-1">
                  <h3 className="font-bold text-gray-900 m-0">{station.name}</h3>
                  <p className="text-sm text-gray-600 m-0 mt-1">Havza: {station.basin}</p>
                  <p className="text-sm text-red-600 font-medium m-0 mt-1">
                    Kritik Eşik: {station.dangerThreshold} m³/s
                  </p>
                  {station.currentDischarge !== undefined && (
                    <p className={`text-sm font-medium m-0 mt-1 ${station.isDanger ? 'text-red-600' : 'text-green-600'}`}>
                      Güncel: {station.currentDischarge} m³/s
                    </p>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

