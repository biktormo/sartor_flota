import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import { fetchGpsAssets, fetchGpsHistory } from '../utils/gpsService';
import { Route, Loader2, PlayCircle, BarChart, Map as MapIcon, Calendar } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const heatmapOptions = {
  radius: 20,
  blur: 20,
  maxZoom: 18,
};

const GpsReportPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  // Fechas por defecto: Hoy y hace 7 días
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar lista al inicio
  useEffect(() => {
    const loadAssets = async () => {
      const assets = await fetchGpsAssets();
      setVehicles(assets);
    };
    loadAssets();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedVehicleId) {
      setError('Por favor, selecciona un vehículo.');
      return;
    }
    setLoading(true);
    setError('');
    setReportData(null);

    // Buscar el objeto vehículo completo usando el ID seleccionado
    const vehicle = vehicles.find(v => String(v.id) === String(selectedVehicleId));
    
    if (!vehicle) {
        setError('Error interno: Vehículo no encontrado en la lista.');
        setLoading(false);
        return;
    }

    try {
        // --- CAMBIO: Usamos vehicle.id (el número largo 8652...) ---
        // En gpsService.js ya mapeamos 'gps' -> 'id'
        const searchKey = vehicle.id; 
        
        const data = await fetchGpsHistory(
          searchKey,
          new Date(dateRange.from),
          new Date(dateRange.to)
        );
      
      if (data.routePoints.length === 0 && data.totalDistance === 0) {
          setError("No se encontraron datos de recorrido para este período.");
      } else {
          setReportData(data);
      }
    } catch (err) {
      setError('No se pudo generar el reporte. Verifica la conexión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1800px] mx-auto">
      
      {/* HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Route className="text-blue-600" /> Reporte de Recorrido GPS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Visualiza rutas y zonas de actividad por vehículo y período.</p>
        </div>
        
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 ml-1">Vehículo</label>
            <select 
                value={selectedVehicleId} 
                onChange={e => setSelectedVehicleId(e.target.value)} 
                className="w-64 border-gray-300 rounded-md text-sm focus:ring-jd-green shadow-sm cursor-pointer"
            >
              <option value="">-- Seleccionar --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                    {v.name} {v.plate ? `(${v.plate})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 ml-1 flex items-center gap-1"><Calendar size={12}/> Desde</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({...p, from: e.target.value}))} className="border-gray-300 rounded-md text-sm focus:ring-jd-green shadow-sm cursor-pointer" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 ml-1 flex items-center gap-1"><Calendar size={12}/> Hasta</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({...p, to: e.target.value}))} className="border-gray-300 rounded-md text-sm focus:ring-jd-green shadow-sm cursor-pointer" />
          </div>
          <button onClick={handleGenerateReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
            Generar
          </button>
        </div>
      </div>

      {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
          </div>
      )}
      
      {reportData && (
        <div className="animate-in fade-in duration-500 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm w-full md:w-1/3">
            <p className="text-sm text-gray-500 font-bold uppercase">Distancia Total Recorrida</p>
            <p className="text-4xl font-black text-blue-700 mt-2">
              {reportData.totalDistance.toLocaleString('es-AR', {maximumFractionDigits: 1})} km
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MAPA DE RUTA */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[500px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><MapIcon size={20}/> Ruta Realizada</h3>
              <div className="flex-1 rounded-lg overflow-hidden border border-gray-100 relative z-0">
                {/* Centramos el mapa en el primer punto de la ruta si existe, sino default */}
                <MapContainer 
                    center={reportData.routePoints.length > 0 ? reportData.routePoints[0] : [-27.21, -61.21]} 
                    zoom={reportData.routePoints.length > 0 ? 10 : 6} 
                    style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  {reportData.routePoints.length > 0 && (
                    <Polyline pathOptions={{ color: 'blue', weight: 4, opacity: 0.7 }} positions={reportData.routePoints} />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* MAPA DE CALOR */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[500px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart size={20}/> Zonas de Mayor Actividad</h3>
              <div className="flex-1 rounded-lg overflow-hidden border border-gray-100 relative z-0">
                 <MapContainer 
                    center={reportData.routePoints.length > 0 ? reportData.routePoints[0] : [-27.21, -61.21]} 
                    zoom={reportData.routePoints.length > 0 ? 10 : 6} 
                    style={{ height: '100%', width: '100%' }}
                 >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    {reportData.heatPoints.length > 0 && (
                       <HeatmapLayer
                          points={reportData.heatPoints}
                          longitudeExtractor={m => m[1]}
                          latitudeExtractor={m => m[0]}
                          intensityExtractor={m => m[2]}
                          {...heatmapOptions}
                       />
                    )}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GpsReportPage;