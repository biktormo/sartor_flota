import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3'; // Asegúrate de tener instalado esto
import { fetchGpsAssets, fetchGpsHistory } from '../utils/gpsService';
import { Route, Loader2, PlayCircle, BarChart, Map as MapIcon, Calendar, Info } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const heatmapOptions = {
  radius: 25,
  blur: 15,
  maxZoom: 18,
};

const GpsReportPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  // Fechas por defecto: Últimos 3 días
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Cargar lista de vehículos al montar
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

    // Buscamos el objeto vehículo para obtener la PATENTE
    const vehicle = vehicles.find(v => String(v.id) === String(selectedVehicleId));
    
    if (!vehicle) {
        setError('Error interno: Vehículo no encontrado.');
        setLoading(false);
        return;
    }

    try {
      // Usamos la patente para el historial según tu documentación (DATOSHISTORICOS -> vehiculo)
      // Si no tiene patente, intentamos con el ID como fallback
      const searchKey = vehicle.plate || vehicle.id;

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
      setError('No se pudo generar el reporte. Revisa la conexión con Cybermapa.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1800px] mx-auto">
      
      {/* --- HEADER Y FILTROS --- */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Route className="text-blue-600" /> Análisis de Recorrido GPS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Visualiza rutas históricas y zonas de calor.</p>
        </div>
        
        <div className="flex items-end gap-3 flex-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 mb-1 ml-1">Vehículo</label>
            <select 
                value={selectedVehicleId} 
                onChange={e => setSelectedVehicleId(e.target.value)} 
                className="w-64 border-gray-300 rounded-md text-sm focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="">-- Seleccionar Unidad --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                    {v.name} {v.plate ? `(${v.plate})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 mb-1 ml-1 flex items-center gap-1"><Calendar size={12}/> Desde</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({...p, from: e.target.value}))} className="border-gray-300 rounded-md text-sm focus:ring-blue-500 shadow-sm cursor-pointer" />
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 mb-1 ml-1 flex items-center gap-1"><Calendar size={12}/> Hasta</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({...p, to: e.target.value}))} className="border-gray-300 rounded-md text-sm focus:ring-blue-500 shadow-sm cursor-pointer" />
          </div>
          
          <button onClick={handleGenerateReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 h-[38px]">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
            {loading ? 'Consultando...' : 'Ver Mapa'}
          </button>
        </div>
      </div>

      {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Info size={18} /> {error}
          </div>
      )}
      
      {/* --- RESULTADOS --- */}
      {reportData && (
        <div className="animate-in fade-in duration-500 space-y-6">
          
          {/* KPI Resumen */}
          <div className="flex gap-4">
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-w-[300px]">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Distancia Total</p>
                <p className="text-4xl font-black text-blue-700 mt-1">
                  {reportData.totalDistance.toLocaleString('es-AR', {maximumFractionDigits: 1})} <span className="text-xl text-gray-400 font-medium">km</span>
                </p>
             </div>
             {/* Aquí podrías agregar más KPIs si la API los devuelve (velocidad máx, tiempo detenido, etc) */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* MAPA DE RUTA (Polyline) */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-[600px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 px-2">
                  <MapIcon size={20} className="text-green-600"/> Trazado del Recorrido
              </h3>
              <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 relative z-0">
                <MapContainer 
                    // Centrar en el primer punto o default
                    center={reportData.routePoints.length > 0 ? reportData.routePoints[0] : [-34.6, -58.4]} 
                    zoom={reportData.routePoints.length > 0 ? 10 : 5} 
                    style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    attribution='&copy; OpenStreetMap' 
                  />
                  {reportData.routePoints.length > 0 && (
                    <>
                        <Polyline pathOptions={{ color: '#2563EB', weight: 4, opacity: 0.8 }} positions={reportData.routePoints} />
                        {/* Marcador Inicio */}
                        <Marker position={reportData.routePoints[0]}><Popup>Inicio</Popup></Marker>
                        {/* Marcador Fin */}
                        <Marker position={reportData.routePoints[reportData.routePoints.length - 1]}><Popup>Fin</Popup></Marker>
                    </>
                  )}
                </MapContainer>
              </div>
            </div>

            {/* MAPA DE CALOR (Heatmap) */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-[600px] flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 px-2">
                  <BarChart size={20} className="text-orange-600"/> Zonas de Permanencia (Heatmap)
              </h3>
              <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 relative z-0">
                 <MapContainer 
                    center={reportData.routePoints.length > 0 ? reportData.routePoints[0] : [-34.6, -58.4]} 
                    zoom={reportData.routePoints.length > 0 ? 10 : 5} 
                    style={{ height: '100%', width: '100%' }}
                 >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    
                    {reportData.heatPoints.length > 0 && (
                       <HeatmapLayer
                          fitBoundsOnLoad
                          fitBoundsOnUpdate
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