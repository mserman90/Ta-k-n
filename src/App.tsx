/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import FloodMap from './components/FloodMap';
import StationDashboard from './components/StationDashboard';
import { useFloodStore } from './store/useFloodStore';
import { Waves, AlertTriangle } from 'lucide-react';

export default function App() {
  const { fetchStations, error } = useFloodStore();

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Waves className="text-blue-300" size={28} />
          <h1 className="text-xl font-bold tracking-tight">Türkiye Nehir Akış Debi ve Sel Taşkın Erken Uyarı Sistemi</h1>
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

