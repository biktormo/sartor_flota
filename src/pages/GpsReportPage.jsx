import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import { fetchGpsAssets, fetchGpsHistory } from '../utils/gpsService';
import { Route, TrendingUp, Loader2, PlayCircle, BarChart, Map as MapIcon, Calendar, Car } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Configuración básica para el mapa de calor
const heatmapOptions = {
  radius: 20,
  blur: 20,
  maxZoom: 18,
};

const GpsReportPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar lista de vehículos GPS al inicio
  useEffect(() => {
    const loadAssets = async () => {
      const assets = await fetchGpsAssets();
      setVehicles(assets);
    };
    loadAssets();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedVehicle) {
      setError('Por favor, selecciona un vehículo.');
      return;
    }
    setLoading(true);
    setError('');
    setReportData(null);

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) {
        setError('Vehículo no encontrado.');
        setLoading(false);
        return;
    }

    try {
      const data = await fetchGpsHistory(
        vehicle.plate || vehicle.id, // Usamos patente o ID
        new Date(dateRange.from),
        new Date(dateRange.to)
      );
      setReportData(data);
    } catch (err) {
      setError('No se pudo generar el reporte. Intenta más tarde.');
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
            <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-48 border-gray-300 rounded-md text-sm focus:ring-jd-green shadow-sm">
              <option value="">-- Todos --</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 ml-1">Desde</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({...p, from: e.target.value}))} className="border-gray-300 rounded-md text-sm focus:ring-jd-green shadow-sm" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 ml-1">Hasta</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({...p, to: e.target.value}))} className="border-gray-300 rounded-md text-sm focus:ring-jd-green shadow-sm" />
          </div>
          <button onClick={handleGenerateReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
            Generar Reporte
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      {/* RESULTADOS */}
      {loading && <p className="text-center text-gray-500 py-10">Cargando historial...</p>}
      
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
              <div className="flex-1 rounded-lg overflow-hidden border border-gray-200">
                <MapContainer center={[-27.21, -61.21]} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {reportData.routePoints.length > 0 && (
                    <Polyline pathOptions={{ color: 'blue', weight: 3 }} positions={reportData.routePoints} />
                  )}
                </MapContainer>
              </div>
            </div>
            {/* MAPA DE CALOR */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[500px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart size={20}/> Zonas de Mayor Actividad</h3>
              <div className="flex-1 rounded-lg overflow-hidden border border-gray-200">
                 <MapContainer center={[-27.21, -61.21]} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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