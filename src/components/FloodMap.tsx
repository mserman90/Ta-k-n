import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useFloodStore, Station } from '../store/useFloodStore';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Custom icon using Lucide React's MapPin as SVG
const customIcon = new L.DivIcon({
  html: `<div style="color: #2563eb; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

export default function FloodMap() {
  const { stations, selectedStation, selectStation } = useFloodStore();

  const center: [number, number] = [38.9637, 38.2433]; // Shifted slightly east to cover neighbors better

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={center}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater selectedStation={selectedStation} />

        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={customIcon}
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
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

