import { useFloodStore } from '../store/useFloodStore';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Brush 
} from 'recharts';
import { AlertCircle, Info, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export default function StationDashboard() {
  const { selectedStation, stationData, isLoading, error, lastUpdated } = useFloodStore();

  if (!selectedStation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
        <Info size={48} className="mb-4 opacity-50" />
        <p className="text-lg">Detayları ve geçmiş taşkın verilerini görmek için haritadan bir istasyon seçin.</p>
      </div>
    );
  }

  // Determine if current latest measurement exceeds danger threshold
  const latestMeasurement = stationData.length > 0 ? stationData[stationData.length - 1] : null;
  const isDanger = latestMeasurement && latestMeasurement.discharge >= selectedStation.dangerThreshold;

  return (
    <div className="h-full flex flex-col bg-white p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{selectedStation.name}</h2>
        <div className="flex justify-between items-center mt-1">
          <p className="text-gray-500">Havza: {selectedStation.basin}</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 font-medium">
              Son Güncelleme: {new Date(lastUpdated).toLocaleString('tr-TR')}
            </p>
          )}
        </div>
      </div>

      {/* Alert Panel */}
      <div className={cn(
        "rounded-lg p-4 mb-6 flex items-start gap-3 border",
        isDanger ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"
      )}>
        {isDanger ? <AlertCircle className="shrink-0 mt-0.5" /> : <Activity className="shrink-0 mt-0.5" />}
        <div>
          <h3 className="font-semibold">
            {isDanger ? "Kritik Eşik Aşıldı! (Taşkın Riski)" : "Normal Akış Seviyesi"}
          </h3>
          <p className="text-sm mt-1 opacity-90">
            Güncel Debi: {latestMeasurement ? `${latestMeasurement.discharge} m³/s` : 'Bilinmiyor'} 
            <br/>
            Kritik Eşik: {selectedStation.dangerThreshold} m³/s
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex-1 min-h-[300px] flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Akış Debi Geçmişi ve Tahminler</h3>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error || stationData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg p-6">
            <AlertCircle size={32} className="mb-2 text-gray-400" />
            <p className="font-medium text-gray-700">Veri mevcut değil</p>
            <p className="text-sm text-center mt-1">
              {error || "Bu istasyon için geçmiş taşkın verisi (inundation history) bulunamadı."}
            </p>
          </div>
        ) : (
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stationData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')}
                  stroke="#888"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#888" 
                  fontSize={12}
                  label={{ value: 'Debi (m³/s)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                <Tooltip 
                  labelFormatter={(val) => new Date(val).toLocaleString('tr-TR')}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <ReferenceLine 
                  y={selectedStation.dangerThreshold} 
                  label="Kritik Eşik" 
                  stroke="red" 
                  strokeDasharray="3 3" 
                />
                <Line 
                  type="monotone" 
                  dataKey="discharge" 
                  name="Ölçülen Debi"
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Brush 
                  dataKey="timestamp" 
                  height={30} 
                  stroke="#3b82f6" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
