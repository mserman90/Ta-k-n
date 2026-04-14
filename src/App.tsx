/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import FloodMap from './components/FloodMap';
import StationDashboard from './components/StationDashboard';
import { useFloodStore } from './store/useFloodStore';
import { Waves, AlertTriangle, BellRing, X } from 'lucide-react';

export default function App() {
  const { fetchStations, refreshData, error, alerts, dismissAlert, stations, selectStation } = useFloodStore();

  useEffect(() => {
    fetchStations();

    // Set up automatic data fetching every 5 minutes (300,000 ms)
    const intervalId = setInterval(() => {
      refreshData();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchStations, refreshData]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden font-sans relative">
      {/* Alerts Container */}
      <div className="fixed bottom-4 right-4 z-[2000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className="bg-red-600 text-white p-4 rounded-lg shadow-2xl flex items-start gap-3 pointer-events-auto border border-red-500 animate-in slide-in-from-right-8 fade-in duration-300"
          >
            <BellRing className="shrink-0 mt-0.5 animate-pulse" size={20} />
            <div className="flex-1 cursor-pointer" onClick={() => {
              const station = stations.find(s => s.id === alert.stationId);
              if (station) selectStation(station);
              dismissAlert(alert.id);
            }}>
              <h4 className="font-bold text-sm">Taşkın Uyarısı: {alert.stationName}</h4>
              <p className="text-xs text-red-100 mt-1">
                Güncel debi (<span className="font-bold">{alert.discharge} m³/s</span>), {alert.threshold} m³/s kritik eşiğini aştı!
              </p>
              <p className="text-[10px] text-red-200 mt-2">
                {new Date(alert.timestamp).toLocaleTimeString('tr-TR')}
              </p>
            </div>
            <button 
              onClick={() => dismissAlert(alert.id)} 
              className="text-red-200 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Waves className="text-blue-300" size={28} />
          <h1 className="text-xl font-bold tracking-tight">Taşkın İzleme Radarı</h1>
        </div>
        <div className="text-sm text-blue-200 font-medium">
          Powered by Google Flood Forecasting
        </div>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center shadow-sm z-20">
          <AlertTriangle className="mr-2" size={16} />
          {error}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map Section */}
        <section className="flex-1 h-[50vh] md:h-full relative border-r border-gray-200 shadow-inner">
          <FloodMap />
        </section>

        {/* Dashboard Section */}
        <section className="w-full md:w-[450px] lg:w-[500px] h-[50vh] md:h-full shadow-lg z-10">
          <StationDashboard />
        </section>
      </main>
    </div>
  );
}

