import React, { useState, useEffect, useMemo } from 'react';
import { Save, Building2, MapPin, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { fetchVehicleSettings, saveVehicleSettings } from '../utils/firebaseService';

const CENTROS_COSTO = ['SERVICIO', 'REPUESTOS', 'VENTAS', 'CSC', 'ADMINISTRACION'];
const LOCALIDADES = ['CHARATA', 'BANDERA', 'QUIMILI'];

const VehiclesPage = ({ data }) => {
  const [activeTab, setActiveTab] = useState('management');
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await fetchVehicleSettings();
      setSettings(savedSettings);
      setLoadingSettings(false);
    };
    loadSettings();
  }, []);

  const uniqueVehicles = useMemo(() => {
    if (!data || data.length === 0) return [];
    const map = new Map();
    data.forEach(row => {
      // Filtramos SARTOR administrativo
      if (!row.unidad || row.unidad.toString().toUpperCase().includes('SARTOR')) return;
      
      if (!map.has(row.unidad)) {
        map.set(row.unidad, {
          id: row.unidad,
          placa: row.placa || 'S/D',
          // AQUI ESTA EL CAMBIO: Usamos los datos del CSV
          marcaCsv: row.marca || '',
          modeloCsv: row.modelo || ''
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [data]);

  const handleSettingChange = (vehicleId, field, value) => {
    setSettings(prev => ({
      ...prev,
      [vehicleId]: {
        ...prev[vehicleId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsArray = Object.keys(settings).map(key => ({
        id: key,
        ...settings[key]
      }));
      await saveVehicleSettings(settingsArray);
      alert('Cambios guardados correctamente.');
    } catch (error) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const ManagementTab = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-jd-green" /> Asignación de Flota
          </h3>
          <p className="text-sm text-gray-500">Confirma datos y asigna centros de costo.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-jd-green hover:bg-green-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-4 pl-6 w-1/6">Unidad / Placa</th>
              <th className="p-4 w-1/6">Marca</th>
              <th className="p-4 w-1/6">Modelo</th>
              <th className="p-4 w-1/4">Centro de Costo</th>
              <th className="p-4 w-1/4 pr-6">Localidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uniqueVehicles.map((vehicle) => {
              const vehicleSettings = settings[vehicle.id] || {};
              
              // Prioridad: Firebase > CSV > String vacío
              const marcaValue = vehicleSettings.marca !== undefined ? vehicleSettings.marca : vehicle.marcaCsv;
              const modeloValue = vehicleSettings.modelo !== undefined ? vehicleSettings.modelo : vehicle.modeloCsv;

              return (
                <tr key={vehicle.id} className="hover:bg-green-50/30 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-gray-800">{vehicle.id}</div>
                    <div className="text-xs text-gray-400 font-mono bg-gray-100 inline-block px-1 rounded mt-1">{vehicle.placa}</div>
                  </td>
                  <td className="p-4">
                    <input 
                      type="text" 
                      placeholder={vehicle.marcaCsv} // Placeholder ayuda a ver qué dice el CSV
                      value={marcaValue}
                      onChange={(e) => handleSettingChange(vehicle.id, 'marca', e.target.value)}
                      className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green focus:border-jd-green bg-white shadow-sm"
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="text" 
                      placeholder={vehicle.modeloCsv}
                      value={modeloValue}
                      onChange={(e) => handleSettingChange(vehicle.id, 'modelo', e.target.value)}
                      className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green focus:border-jd-green bg-white shadow-sm"
                    />
                  </td>
                  <td className="p-4">
                    <select 
                      value={vehicleSettings.centroCosto || ''}
                      onChange={(e) => handleSettingChange(vehicle.id, 'centroCosto', e.target.value)}
                      className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green focus:border-jd-green bg-white shadow-sm cursor-pointer"
                    >
                      <option value="">-- Seleccionar --</option>
                      {CENTROS_COSTO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                  <td className="p-4 pr-6">
                    <select 
                      value={vehicleSettings.localidad || ''}
                      onChange={(e) => handleSettingChange(vehicle.id, 'localidad', e.target.value)}
                      className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green focus:border-jd-green bg-white shadow-sm cursor-pointer"
                    >
                      <option value="">-- Seleccionar --</option>
                      {LOCALIDADES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
            {uniqueVehicles.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400 bg-gray-50"><AlertCircle className="mx-auto mb-2 opacity-50" size={32} />No hay vehículos. Carga un CSV primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loadingSettings) return <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> Cargando configuración...</div>;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Vehículos y Flota</h1><p className="text-gray-500 mt-1">Gestión administrativa.</p></div>
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
          <button onClick={() => setActiveTab('management')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'management' ? 'bg-jd-green text-white shadow' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>Gestión de Datos</button>
          <button onClick={() => setActiveTab('efficiency')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'efficiency' ? 'bg-jd-green text-white shadow' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>Eficiencia</button>
        </div>
      </div>
      {activeTab === 'management' ? <ManagementTab /> : <div className="p-8 bg-white rounded-xl border border-gray-200 text-center text-gray-500"><TrendingUp className="mx-auto mb-4 text-jd-green" size={48} /><h3 className="text-xl font-bold">Módulo de Eficiencia</h3><p>Gráficos de rendimiento disponibles próximamente.</p></div>}
    </div>
  );
};

export default VehiclesPage;