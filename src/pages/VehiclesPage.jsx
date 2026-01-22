import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, YAxis, CartesianGrid, ZAxis 
} from 'recharts';
import { 
  Save, Filter, MapPin, Building2, Car, TrendingUp, AlertCircle, Loader2, Gauge, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { fetchVehicleSettings, saveVehicleSettings } from '../utils/firebaseService';

// Opciones
const CENTROS_COSTO = ['SERVICIO', 'REPUESTOS', 'VENTAS', 'CSC', 'ADMINISTRACION'];
const LOCALIDADES = ['CHARATA', 'BANDERA', 'QUIMILI'];

const VehiclesPage = ({ data }) => {
  const [activeTab, setActiveTab] = useState('efficiency'); // Arrancamos en eficiencia para ver lo nuevo
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Cargar configuraciones
  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await fetchVehicleSettings();
      setSettings(savedSettings);
      setLoadingSettings(false);
    };
    loadSettings();
  }, []);

  // --- LÓGICA DE DATOS ---
  
  // 1. Lista única para gestión (Tab 1)
  const uniqueVehicles = useMemo(() => {
    if (!data || data.length === 0) return [];
    const map = new Map();
    data.forEach(row => {
      if (!row.unidad || row.unidad.toString().toUpperCase().includes('SARTOR')) return;
      if (!map.has(row.unidad)) {
        map.set(row.unidad, {
          id: row.unidad,
          placa: row.placa || 'S/D',
          marcaCsv: row.marca || '',
          modeloCsv: row.modelo || ''
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [data]);

  // 2. Datos procesados para eficiencia (Tab 2)
  const efficiencyData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const vehiclesMap = {};

    // Agrupar consumos
    data.forEach(row => {
      if (!row.unidad || row.unidad.toString().toUpperCase().includes('SARTOR')) return;
      
      if (!vehiclesMap[row.unidad]) {
        vehiclesMap[row.unidad] = {
          id: row.unidad,
          litros: 0,
          costo: 0,
          csvMarca: row.marca,
          csvModelo: row.modelo
        };
      }
      vehiclesMap[row.unidad].litros += row.litros;
      vehiclesMap[row.unidad].costo += row.costo;
    });

    return Object.values(vehiclesMap).map(v => {
      const config = settings[v.id] || {};
      
      // Datos combinados
      const marca = config.marca || v.csvMarca || '';
      const modelo = config.modelo || v.csvModelo || '';
      const distancia = parseFloat(config.distanciaRecorrida) || 0; // Dato manual guardado en Firebase
      
      // Cálculo de Rendimiento
      // Evitar división por cero
      const rendimiento = v.litros > 0 ? (distancia / v.litros) : 0;

      return {
        ...v,
        marca,
        modelo,
        distancia,
        rendimiento
      };
    }).sort((a, b) => b.litros - a.litros); // Ordenar por consumo
  }, [data, settings]);


  // --- MANEJADORES ---

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
      alert('Datos guardados exitosamente (Centros de Costo, Marcas y Distancias).');
    } catch (error) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SUB-COMPONENTES ---

  const ManagementTab = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-jd-green" /> Asignación de Flota
          </h3>
          <p className="text-sm text-gray-500">Define marca, modelo y centro de costos administrativo.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-jd-green hover:bg-green-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-4 pl-6 w-1/6">Unidad</th>
              <th className="p-4 w-1/6">Marca</th>
              <th className="p-4 w-1/6">Modelo</th>
              <th className="p-4 w-1/4">Centro de Costo</th>
              <th className="p-4 w-1/4 pr-6">Localidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uniqueVehicles.map((vehicle) => {
              const vehicleSettings = settings[vehicle.id] || {};
              const marcaValue = vehicleSettings.marca !== undefined ? vehicleSettings.marca : vehicle.marcaCsv;
              const modeloValue = vehicleSettings.modelo !== undefined ? vehicleSettings.modelo : vehicle.modeloCsv;

              return (
                <tr key={vehicle.id} className="hover:bg-green-50/30 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-gray-800">{vehicle.id}</div>
                    <div className="text-xs text-gray-400 font-mono bg-gray-100 inline-block px-1 rounded mt-1">{vehicle.placa}</div>
                  </td>
                  <td className="p-4">
                    <input type="text" placeholder={vehicle.marcaCsv} value={marcaValue} onChange={(e) => handleSettingChange(vehicle.id, 'marca', e.target.value)} className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green bg-white shadow-sm" />
                  </td>
                  <td className="p-4">
                    <input type="text" placeholder={vehicle.modeloCsv} value={modeloValue} onChange={(e) => handleSettingChange(vehicle.id, 'modelo', e.target.value)} className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green bg-white shadow-sm" />
                  </td>
                  <td className="p-4">
                    <select value={vehicleSettings.centroCosto || ''} onChange={(e) => handleSettingChange(vehicle.id, 'centroCosto', e.target.value)} className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green bg-white shadow-sm cursor-pointer">
                      <option value="">-- Seleccionar --</option>
                      {CENTROS_COSTO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                  <td className="p-4 pr-6">
                    <select value={vehicleSettings.localidad || ''} onChange={(e) => handleSettingChange(vehicle.id, 'localidad', e.target.value)} className="w-full border-gray-300 rounded-md text-sm focus:ring-jd-green bg-white shadow-sm cursor-pointer">
                      <option value="">-- Seleccionar --</option>
                      {LOCALIDADES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const EfficiencyTab = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
       <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Gauge className="text-jd-green" /> Análisis de Rendimiento
          </h3>
          <p className="text-sm text-gray-500">Ingresa la distancia recorrida en el periodo para calcular el rendimiento.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-jd-green hover:bg-green-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Guardar Odómetros' : 'Guardar Odómetros'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-4 pl-6">Unidad / Detalle</th>
              <th className="p-4 text-right">Consumo (L)</th>
              <th className="p-4 text-right">Costo ($)</th>
              <th className="p-4 w-48 text-right bg-blue-50/50">Recorrido (Km/Hs)</th>
              <th className="p-4 text-center">Rendimiento</th>
              <th className="p-4 pr-6 text-center">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {efficiencyData.map((item) => {
              // Lógica de Semáforo
              let statusColor = 'text-gray-500';
              let statusIcon = <Info size={16} />;
              let statusText = 'Sin Datos';
              let bgRow = '';

              if (item.distancia > 0 && item.litros > 0) {
                const kpl = item.rendimiento;
                
                if (kpl > 16) {
                  // Rendimiento sospechosamente alto = Posible carga fuera de sistema
                  statusColor = 'text-red-600';
                  statusIcon = <AlertTriangle size={16} className="text-red-500" />;
                  statusText = 'Revisar (Alto)';
                  bgRow = 'bg-red-50/30';
                } else if (kpl < 4) {
                  // Rendimiento muy bajo = Alto consumo o Maquinaria Pesada
                  statusColor = 'text-orange-600';
                  statusIcon = <AlertCircle size={16} className="text-orange-500" />;
                  statusText = 'Consumo Alto';
                } else {
                  // Rango normal (ej: 4 a 16 km/l para pickups)
                  statusColor = 'text-green-600';
                  statusIcon = <CheckCircle size={16} className="text-green-500" />;
                  statusText = 'Normal';
                }
              }

              return (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${bgRow}`}>
                  <td className="p-4 pl-6">
                    <div className="font-bold text-gray-800">{item.id}</div>
                    <div className="text-xs text-gray-500">{item.marca} {item.modelo}</div>
                  </td>
                  <td className="p-4 text-right font-bold text-gray-700">
                    {item.litros.toLocaleString('es-AR')} L
                  </td>
                  <td className="p-4 text-right font-mono text-gray-600">
                    ${item.costo.toLocaleString('es-AR')}
                  </td>
                  
                  {/* CAMPO EDITABLE DE DISTANCIA */}
                  <td className="p-4 bg-blue-50/30">
                    <div className="flex items-center justify-end gap-2">
                      <input 
                        type="number" 
                        placeholder="0"
                        value={settings[item.id]?.distanciaRecorrida || ''}
                        onChange={(e) => handleSettingChange(item.id, 'distanciaRecorrida', e.target.value)}
                        className="w-24 text-right border-gray-300 rounded-md text-sm focus:ring-jd-green focus:border-jd-green bg-white shadow-sm p-1"
                      />
                      <span className="text-xs text-gray-400">km</span>
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    {item.distancia > 0 ? (
                      <span className={`font-bold text-base ${statusColor}`}>
                        {item.rendimiento.toFixed(2)} <span className="text-xs font-normal text-gray-400">km/L</span>
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  <td className="p-4 pr-6">
                    <div className={`flex items-center justify-center gap-1.5 text-xs font-bold border px-2 py-1 rounded-full w-fit mx-auto ${
                      statusText === 'Normal' ? 'bg-green-50 border-green-200 text-green-700' :
                      statusText.includes('Revisar') ? 'bg-red-50 border-red-200 text-red-700' :
                      statusText.includes('Alto') ? 'bg-orange-50 border-orange-200 text-orange-700' :
                      'bg-gray-100 border-gray-200 text-gray-500'
                    }`}>
                      {statusIcon} {statusText}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {efficiencyData.length === 0 && (
               <tr><td colSpan="6" className="p-8 text-center text-gray-400">Sin datos de consumo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-yellow-50 border-t border-yellow-100 p-4 text-xs text-yellow-800 flex gap-2">
        <AlertTriangle size={16} />
        <div>
          <p><strong>Nota sobre el cálculo:</strong> Rendimiento = Distancia Ingresada / Litros Cargados en Sistema.</p>
          <p>Si el rendimiento es anormalmente alto ({'>'}16 km/L), es probable que el vehículo haya cargado combustible fuera del sistema (en otras estaciones no registradas).</p>
        </div>
      </div>
    </div>
  );

  if (loadingSettings) return <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> Cargando configuración...</div>;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Vehículos y Flota</h1>
          <p className="text-gray-500 mt-1">Gestión administrativa y análisis de eficiencia.</p>
        </div>
        
        {/* TABS */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
          <button
            onClick={() => setActiveTab('efficiency')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === 'efficiency' 
                ? 'bg-jd-green text-white shadow' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Eficiencia
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === 'management' 
                ? 'bg-jd-green text-white shadow' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Gestión de Datos
          </button>
        </div>
      </div>

      {activeTab === 'efficiency' ? <EfficiencyTab /> : <ManagementTab />}
    </div>
  );
};

export default VehiclesPage;