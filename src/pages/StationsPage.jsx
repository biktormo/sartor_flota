import React, { useState, useEffect, useMemo } from 'react';
import { Save, Navigation, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { fetchStationSettings, saveStationSettings } from '../utils/firebaseService';
import FleetMap from '../components/FleetMap'; // Importar el mapa

const StationsPage = ({ data }) => {
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const saved = await fetchStationSettings();
      setSettings(saved);
      setLoading(false);
    };
    load();
  }, []);

  const uniqueStations = useMemo(() => {
    if (!data || data.length === 0) return [];
    const map = new Map();
    
    data.forEach(row => {
      if (!row.estacion || row.estacion === 'Externo') return;
      if (!map.has(row.estacion)) {
        map.set(row.estacion, {
          id: row.estacion,
          nombre: row.estacion,
          direccionCsv: row.direccion || '',
          ciudadCsv: row.ciudad || ''
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [data]);

  const handleChange = (id, field, value) => {
    setSettings(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const arrayToSave = uniqueStations.map(station => {
        const userConfig = settings[station.id] || {};
        return {
          id: station.id,
          direccion: userConfig.direccion !== undefined ? userConfig.direccion : station.direccionCsv,
          localidad: userConfig.localidad !== undefined ? userConfig.localidad : station.ciudadCsv,
          lat: userConfig.lat || '',
          lng: userConfig.lng || ''
        };
      });
      await saveStationSettings(arrayToSave);
      const newSettings = await fetchStationSettings();
      setSettings(newSettings);
      alert('Datos de estaciones guardados correctamente.');
    } catch (error) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando...</div>;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      
      {/* NUEVO: MAPA AL PRINCIPIO */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[400px] flex flex-col">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="text-jd-green" />
          <h2 className="text-lg font-bold text-gray-800">Mapa de Estaciones Utilizadas</h2>
        </div>
        <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden relative z-0">
           {/* Reutilizamos el mapa, pasando la data para que calcule los circulos */}
           <FleetMap data={data} stationSettings={settings} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Navigation className="text-jd-green" /> Gestión de Coordenadas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Carga las coordenadas GPS para que aparezcan en el mapa superior.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-jd-green hover:bg-green-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4 pl-6 w-1/4">Nombre Estación (ID)</th>
                <th className="p-4 w-1/4">Dirección</th>
                <th className="p-4 w-1/6">Localidad</th>
                <th className="p-4 w-32">Latitud</th>
                <th className="p-4 w-32 pr-6">Longitud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {uniqueStations.map((station) => {
                const config = settings[station.id] || {};
                const direccionVal = config.direccion !== undefined ? config.direccion : station.direccionCsv;
                const localidadVal = config.localidad !== undefined ? config.localidad : station.ciudadCsv;

                return (
                  <tr key={station.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-gray-800">{station.nombre}</td>
                    <td className="p-4">
                      <input type="text" placeholder={station.direccionCsv || "Sin dirección"} value={direccionVal} onChange={(e) => handleChange(station.id, 'direccion', e.target.value)} className="w-full border-gray-300 rounded-md text-sm pl-2 focus:ring-jd-green bg-white shadow-sm" />
                    </td>
                    <td className="p-4">
                      <input type="text" placeholder={station.ciudadCsv || "Sin ciudad"} value={localidadVal} onChange={(e) => handleChange(station.id, 'localidad', e.target.value)} className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green bg-white shadow-sm" />
                    </td>
                    <td className="p-4">
                      <input type="text" placeholder="-27.215..." value={config.lat || ''} onChange={(e) => handleChange(station.id, 'lat', e.target.value)} className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green bg-white shadow-sm font-mono text-xs" />
                    </td>
                    <td className="p-4 pr-6">
                      <input type="text" placeholder="-61.200..." value={config.lng || ''} onChange={(e) => handleChange(station.id, 'lng', e.target.value)} className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green bg-white shadow-sm font-mono text-xs" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StationsPage;