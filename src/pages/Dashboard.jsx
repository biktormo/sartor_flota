import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Fuel, Gauge, Tractor, ArrowUpRight, ArrowRight, Building2, MapPin, X, Users, DollarSign, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { processMonthlyData } from '../utils/dataProcessor';
import { fetchVehicleSettings, fetchStationSettings } from '../utils/firebaseService';
import FleetMap from '../components/FleetMap';

// --- HELPERS ---

const formatCompact = (num, isCurrency = false) => {
  if (!num) return isCurrency ? '$0' : '0';
  const formatter = new Intl.NumberFormat('es-AR', {
    notation: "compact",
    maximumFractionDigits: 1,
    style: isCurrency ? 'currency' : 'decimal',
    currency: 'ARS'
  });
  return formatter.format(num);
};

// Función de ordenamiento genérica
const sortData = (data, config) => {
  if (!config.key) return data;

  return [...data].sort((a, b) => {
    let aValue = a[config.key];
    let bValue = b[config.key];

    // Manejo especial para fechas (DD/MM/YYYY o YYYY-MM-DD)
    if (config.key === 'fecha') {
      const parseDate = (dateStr) => {
        if (!dateStr) return 0;
        if (dateStr.includes('/')) {
          const parts = dateStr.split(' ')[0].split('/'); // Quitar hora si existe
          if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
        }
        return new Date(dateStr).getTime();
      };
      aValue = parseDate(aValue);
      bValue = parseDate(bValue);
    }

    if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Componente de Encabezado Ordenable
const SortableHeader = ({ label, sortKey, currentConfig, onSort, align = 'left' }) => {
  const isActive = currentConfig.key === sortKey;
  
  return (
    <th 
      className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-${align} ${align === 'right' ? 'pr-6' : 'pl-6'}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <div className="text-gray-400">
          {isActive ? (
            currentConfig.direction === 'asc' ? <ArrowUp size={14} className="text-jd-green"/> : <ArrowDown size={14} className="text-jd-green"/>
          ) : (
            <ArrowUpDown size={14} className="opacity-50"/>
          )}
        </div>
      </div>
    </th>
  );
};

// --- COMPONENTE KPICard ---
const KPICard = ({ title, value, subtext, icon: Icon, trend, trendValue, iconColor }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-jd-green/30 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg bg-gray-50 ${iconColor}`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
          trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : null} {trendValue}
        </span>
      )}
    </div>
    <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
    <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight">{value}</h3>
    <p className="text-xs text-gray-400 mt-2">{subtext}</p>
  </div>
);

// --- MODAL: RANKING VEHÍCULOS ---
const AllVehiclesModal = ({ isOpen, onClose, vehicles, maxLitros }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div><h3 className="text-xl font-bold text-gray-800">Ranking Completo de Consumo</h3><p className="text-sm text-gray-500">{vehicles.length} unidades registradas</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 w-16 text-center">#</th>
                <th className="p-4">Unidad / Detalle</th>
                <th className="p-4">Centro de Costo</th>
                <th className="p-4">Conductores</th>
                <th className="p-4 text-right">Consumo (L)</th>
                <th className="p-4 text-right">Gasto ($)</th>
                <th className="p-4 w-32">% Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-center font-bold text-gray-400">{idx + 1}</td>
                  <td className="p-4"><div className="font-bold text-gray-800">{item.id}</div><div className="text-xs text-gray-500">{item.detalle}</div></td>
                  <td className="p-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{item.centroCosto}</span></td>
                  <td className="p-4"><div className="text-xs text-gray-600 max-w-[200px] truncate" title={item.conductores}>{item.conductores || '-'}</div></td>
                  <td className="p-4 text-right font-bold text-jd-green">{formatCompact(item.litros)} L</td>
                  <td className="p-4 text-right font-mono text-gray-700">{formatCompact(item.costo, true)}</td>
                  <td className="p-4"><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-jd-green h-2 rounded-full" style={{ width: `${(item.litros / maxLitros) * 100}%` }}></div></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 text-right bg-gray-50 rounded-b-xl"><button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">Cerrar</button></div>
      </div>
    </div>
  );
};

// --- MODAL: HISTORIAL COMPLETO DE CARGAS ---
const FullHistoryModal = ({ isOpen, onClose, data }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedData = useMemo(() => sortData(data, sortConfig), [data, sortConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Historial Completo de Cargas</h3>
            <p className="text-sm text-gray-500">{data.length} registros totales</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <SortableHeader label="Fecha" sortKey="fecha" currentConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Unidad" sortKey="unidad" currentConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Conductor" sortKey="conductor" currentConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Estación" sortKey="estacion" currentConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Litros" sortKey="litros" currentConfig={sortConfig} onSort={handleSort} align="right" />
                <SortableHeader label="Costo (M.N.)" sortKey="costo" currentConfig={sortConfig} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                  <td className="p-4 pl-6 text-gray-500 font-medium whitespace-nowrap">{row.fecha}</td>
                  <td className="p-4 font-bold text-gray-800">{row.unidad}</td>
                  <td className="p-4 text-gray-600 text-xs">{row.conductor}</td>
                  <td className="p-4 text-gray-500 text-xs truncate max-w-[200px]" title={row.direccion || ''}>{row.estacion}</td>
                  <td className="p-4 text-right font-mono font-bold text-gray-700">{row.litros.toLocaleString('es-AR')} L</td>
                  <td className="p-4 text-right text-gray-500 font-mono pr-6">${row.costo.toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-200 text-right bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DASHBOARD ---
const Dashboard = ({ data, kpis }) => {
  const [vehicleSettings, setVehicleSettings] = useState({});
  const [stationSettings, setStationSettings] = useState({});
  const [isVehiclesModalOpen, setIsVehiclesModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Estado para el ordenamiento de la tabla pequeña (Preview)
  const [previewSortConfig, setPreviewSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [vSettings, sSettings] = await Promise.all([fetchVehicleSettings(), fetchStationSettings()]);
        setVehicleSettings(vSettings);
        setStationSettings(sSettings);
      } catch (error) { console.error(error); }
    };
    loadSettings();
  }, []);

  const hasRealData = data && data.length > 0;
  
  const displayTotal = hasRealData ? formatCompact(kpis.totalLitros) : "0";
  const displayCost = hasRealData ? formatCompact(kpis.totalCosto, true) : "$0";
  
  const chartData = useMemo(() => hasRealData ? processMonthlyData(data) : [], [data, hasRealData]);

  const avgMonthlyCost = useMemo(() => {
    if (!hasRealData || chartData.length === 0) return "$0";
    const lastMonths = chartData.slice(-6);
    const totalLastMonths = lastMonths.reduce((sum, item) => sum + item.costo, 0);
    const avg = totalLastMonths / lastMonths.length;
    return formatCompact(avg, true);
  }, [chartData, hasRealData]);

  // Lista de Vehículos
  const fullVehicleList = useMemo(() => {
    if (!hasRealData) return [];
    
    // Calculamos costos por unidad
    const costsByUnit = {};
    data.forEach(row => {
        if (!costsByUnit[row.unidad]) costsByUnit[row.unidad] = 0;
        costsByUnit[row.unidad] += row.costo;
    });

    const filteredList = kpis.topConsumers.filter(item => {
      if (!item.unidad) return false;
      const nombre = item.unidad.toString().toUpperCase();
      return !nombre.includes('SARTOR') && !nombre.includes('DAVID') && nombre.trim() !== '';
    });

    const maxLitros = filteredList.length > 0 ? filteredList[0].litros : 1;

    return filteredList.map(c => {
      const config = vehicleSettings[c.unidad] || {};
      let marcaModelo = config.marca ? `${config.marca} ${config.modelo || ''}` : null;
      if (!marcaModelo && c.marca) marcaModelo = `${c.marca} ${c.modelo || ''}`;

      const driverList = c.conductores || [];
      const driverString = driverList.length > 0 ? driverList.join(', ') : 'Sin conductor';

      return {
        id: c.unidad,
        detalle: marcaModelo || `Unidad #${c.unidad}`,
        litros: c.litros,
        costo: costsByUnit[c.unidad] || 0,
        percent: (c.litros / maxLitros) * 100,
        conductores: driverString,
        centroCosto: config.centroCosto || 'Sin Asignar',
        localidad: config.localidad || 'Sin Asignar'
      };
    });
  }, [kpis, hasRealData, vehicleSettings, data]);

  const topVehicles = fullVehicleList.slice(0, 5);
  const maxLitrosForModal = fullVehicleList.length > 0 ? fullVehicleList[0].litros : 1;

  // Centro de costos
  const costCenterData = useMemo(() => {
    if (!hasRealData) return { byCenter: [], byLocation: [] };
    const centerMap = {};
    const locationMap = {};
    let totalLitrosFiltered = 0;

    data.forEach(row => {
      if (row.unidad && row.unidad.toUpperCase().includes('SARTOR')) return;
      const config = vehicleSettings[row.unidad] || {};
      const center = config.centroCosto || 'Sin Asignar';
      const location = config.localidad || 'Sin Asignar';

      if (!centerMap[center]) centerMap[center] = 0;
      centerMap[center] += row.litros;
      if (!locationMap[location]) locationMap[location] = 0;
      locationMap[location] += row.litros;
      totalLitrosFiltered += row.litros;
    });

    const formatData = (map) => Object.entries(map)
      .map(([name, value]) => ({ name, value, share: ((value / totalLitrosFiltered) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);

    return { byCenter: formatData(centerMap), byLocation: formatData(locationMap) };
  }, [data, vehicleSettings, hasRealData]);

  const COLORS = ['#367C2B', '#F59E0B', '#3B82F6', '#EF4444', '#131614', '#9CA3AF'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">{`${(percent * 100).toFixed(1)}%`}</text>;
  };

  // --- LÓGICA DE ORDENAMIENTO TABLA PREVIEW ---
  const handlePreviewSort = (key) => {
    setPreviewSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const previewTableData = useMemo(() => {
    if (!hasRealData) return [];
    // Ordenar toda la data
    const sorted = sortData(data, previewSortConfig);
    // Mostrar solo los primeros 8 del orden actual
    return sorted.slice(0, 8);
  }, [data, hasRealData, previewSortConfig]);


  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      
      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard title="Litros Totales" value={`${displayTotal} L`} subtext="Histórico acumulado" icon={Fuel} trend="up" trendValue="Activo" iconColor="text-jd-green" />
        <KPICard title="Gasto Estimado (M.N.)" value={displayCost} subtext="Total acumulado" icon={Gauge} trend="neutral" trendValue="Estable" iconColor="text-blue-600" />
        <KPICard title="Gasto Promedio Mensual" value={avgMonthlyCost} subtext={`Últimos ${Math.min(6, chartData.length)} meses`} icon={DollarSign} trend="neutral" trendValue="Media" iconColor="text-purple-600" />
        <KPICard title="Unidades Reportadas" value={hasRealData ? kpis.topConsumers.length : "0"} subtext="Vehículos únicos" icon={Tractor} trend="up" trendValue="Flota" iconColor="text-orange-600" />
      </div>

      {/* GRILLA PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Consumo Mensual</h3>
            <span className="bg-green-50 text-jd-green px-3 py-1 rounded-md text-xs font-bold border border-green-100">Litros</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={40}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                  formatter={(value, name) => [name === 'costo' ? formatCompact(value, true) : `${formatCompact(value)} L`, name === 'costo' ? 'Gasto' : 'Consumo']} />
                <Bar dataKey="litros" fill="#367C2B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[450px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Mayor Consumo</h3>
            <button onClick={() => setIsVehiclesModalOpen(true)} className="text-jd-green text-xs font-bold uppercase hover:underline flex items-center gap-1">Ver Tabla Completa <ArrowRight size={14}/></button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {topVehicles.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Sin datos.</p> : topVehicles.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>#{idx + 1}</div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">{item.id}</h4>
                      <span className="text-[10px] text-gray-400 uppercase">{item.detalle}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-jd-green">{formatCompact(item.litros)} L</span>
                    <span className="text-[10px] text-gray-500 font-mono">{formatCompact(item.costo, true)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Users size={12} className="text-gray-400" />
                  <span className="truncate max-w-[250px]">{item.conductores}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                  <div className={`h-1 rounded-full ${idx === 0 ? 'bg-jd-green' : 'bg-jd-green/60'}`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRÁFICOS CIRCULARES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><Building2 className="text-jd-green" size={20}/> Consumo por Centro de Costo</h3>
          <p className="text-xs text-gray-400 mb-6">Distribución de litros y porcentaje del total</p>
          <div className="h-[300px] w-full flex flex-col md:flex-row items-center">
            <div className="h-full w-full md:w-2/3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costCenterData.byCenter} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={2} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                    {costCenterData.byCenter.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value.toLocaleString('es-AR')} L (${props.payload.share}%)`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/3 flex flex-col gap-3 pl-4 border-l border-gray-100">
              {costCenterData.byCenter.map((entry, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div><span className="text-gray-600 font-medium">{entry.name}</span></div>
                  <div className="text-right"><div className="font-bold text-gray-800">{entry.share}%</div><div className="text-[10px] text-gray-400">{formatCompact(entry.value)} L</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><MapPin className="text-orange-600" size={20}/> Consumo por Localidad</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costCenterData.byLocation} cx="50%" cy="50%" innerRadius={0} outerRadius={100} fill="#8884d8" paddingAngle={2} dataKey="value">
                  {costCenterData.byLocation.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toLocaleString('es-AR')} L`]} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MAPA DE FLOTA */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[500px] flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MapPin className="text-jd-green" /> Mapa de Consumo</h3>
          <p className="text-xs text-gray-400">Ubicación de estaciones y volumen de carga</p>
        </div>
        <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden relative">
           <FleetMap data={data} stationSettings={stationSettings} />
        </div>
      </div>

      {/* HISTORIAL RECIENTE CON ORDENAMIENTO */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200"><h3 className="text-lg font-bold text-gray-800">Cargas Recientes</h3></div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                        <SortableHeader label="Fecha" sortKey="fecha" currentConfig={previewSortConfig} onSort={handlePreviewSort} />
                        <SortableHeader label="Unidad" sortKey="unidad" currentConfig={previewSortConfig} onSort={handlePreviewSort} />
                        <SortableHeader label="Conductor" sortKey="conductor" currentConfig={previewSortConfig} onSort={handlePreviewSort} />
                        <SortableHeader label="Estación" sortKey="estacion" currentConfig={previewSortConfig} onSort={handlePreviewSort} />
                        <SortableHeader label="Litros" sortKey="litros" currentConfig={previewSortConfig} onSort={handlePreviewSort} align="right" />
                        <SortableHeader label="Costo (M.N.)" sortKey="costo" currentConfig={previewSortConfig} onSort={handlePreviewSort} align="right" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {previewTableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                            <td className="p-4 pl-6 text-gray-500 font-medium whitespace-nowrap">{row.fecha}</td>
                            <td className="p-4 font-bold text-gray-800">{row.unidad}</td>
                            <td className="p-4 text-gray-600 text-xs">{row.conductor}</td>
                            <td className="p-4 text-gray-500 text-xs md:text-sm truncate max-w-[150px]" title={row.direccion || ''}>{row.estacion}</td>
                            <td className="p-4 text-right font-mono font-bold text-gray-700">{row.litros.toLocaleString('es-AR')} L</td>
                            <td className="p-4 text-right text-gray-500 font-mono pr-6">${row.costo.toLocaleString('es-AR')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* BOTÓN VER HISTORIAL COMPLETO */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-center">
             <button 
               onClick={() => setIsHistoryModalOpen(true)}
               className="text-sm font-bold text-jd-green flex items-center gap-1 hover:underline"
             >
                Ver Historial Completo <ArrowRight size={16} />
             </button>
        </div>
      </div>

      {/* MODALES */}
      <AllVehiclesModal isOpen={isVehiclesModalOpen} onClose={() => setIsVehiclesModalOpen(false)} vehicles={fullVehicleList} maxLitros={maxLitrosForModal} />
      <FullHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} data={data} />
    </div>
  );
};

export default Dashboard;