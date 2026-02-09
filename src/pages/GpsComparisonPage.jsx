import React, { useState, useEffect } from 'react';
import { fetchGpsAssets, fetchGpsDistance, matchFleetData } from '../utils/gpsService';
import { Satellite, Loader2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const GpsComparisonPage = ({ data }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsAssets, setGpsAssets] = useState([]);

  // 1. Cargar lista de vehículos GPS al entrar
  useEffect(() => {
    const init = async () => {
      const assets = await fetchGpsAssets();
      setGpsAssets(assets);
    };
    init();
  }, []);

  // 2. Procesar cruce de datos
  const handleProcess = async () => {
    if (!data || data.length === 0) return;
    setLoading(true);

    try {
        // INTENTO DE RECARGA SI NO HAY VEHÍCULOS
      let currentAssets = gpsAssets;
      if (currentAssets.length === 0) {
          currentAssets = await fetchGpsAssets();
          setGpsAssets(currentAssets);
      }
      // A. Cruzar referencias
      const { matchedData, dateRange } = matchFleetData(data, gpsAssets);

      // B. Buscar distancias reales para cada vehículo vinculado
      const finalReport = await Promise.all(matchedData.map(async (item) => {
        if (!item.gpsId) return item;

        // Pedir a Cybermapa los KM recorridos
        const distanceKm = await fetchGpsDistance(item.gpsId, dateRange.min, dateRange.max);
        
        return {
          ...item,
          gpsDistance: distanceKm,
          rendimientoReal: item.litrosCsv > 0 ? (distanceKm / item.litrosCsv) : 0
        };
      }));

      setReport(finalReport);

    } catch (error) {
      console.error(error);
      alert("Error conectando con Cybermapa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Satellite className="text-blue-600" /> Control GPS vs Surtidor
          </h1>
          <p className="text-sm text-gray-500 mt-1">Compara los litros facturados contra el recorrido real satelital.</p>
        </div>
        <button 
          onClick={handleProcess} 
          disabled={loading} // <--- QUITAMOS "|| gpsAssets.length === 0"
          className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${loading ? 'opacity-50' : ''}`}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          {loading ? 'Sincronizando GPS...' : 'Analizar Flota'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4 pl-6">Unidad (CSV)</th>
                <th className="p-4">Vinculación GPS</th>
                <th className="p-4 text-right">Litros Pagados</th>
                <th className="p-4 text-right font-bold text-blue-700 bg-blue-50/30">Km Reales (GPS)</th>
                <th className="p-4 text-center">Rendimiento Real</th>
                <th className="p-4 pr-6 text-center">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.map((row, idx) => {
                const posibleFuga = row.rendimientoReal > 0 && row.rendimientoReal < 4; 
                const cargaExterna = row.rendimientoReal > 18;

                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-gray-800">
                      {row.unidad} <span className="text-xs text-gray-400 ml-1">({row.placa})</span>
                    </td>
                    <td className="p-4 text-xs">
                      {row.gpsId ? (
                        <span className="text-green-600 flex items-center gap-1"><Satellite size={12}/> {row.gpsName}</span>
                      ) : (
                        <span className="text-gray-400 italic">No vinculado</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-600">
                      {row.litrosCsv.toLocaleString('es-AR')} L
                    </td>
                    <td className="p-4 text-right font-bold text-blue-700 bg-blue-50/30">
                      {row.gpsDistance > 0 ? `${row.gpsDistance.toLocaleString('es-AR')} km` : '-'}
                    </td>
                    <td className="p-4 text-center">
                      {row.rendimientoReal > 0 
                        ? <span className="font-bold">{row.rendimientoReal.toFixed(2)} km/L</span> 
                        : '-'}
                    </td>
                    <td className="p-4 pr-6 text-center">
                      {posibleFuga && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
                          <AlertTriangle size={12}/> Fuga Detectada
                        </span>
                      )}
                      {cargaExterna && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold">
                          <AlertTriangle size={12}/> Carga Externa
                        </span>
                      )}
                      {!posibleFuga && !cargaExterna && row.gpsDistance > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-bold">
                          <CheckCircle size={12}/> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {report.length === 0 && !loading && (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400">Presiona "Analizar Flota" para conectar con Cybermapa.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GpsComparisonPage;