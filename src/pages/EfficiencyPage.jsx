import React from 'react';
import { 
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  ScatterChart, Scatter, YAxis, CartesianGrid, ZAxis 
} from 'recharts';
import { 
  Download, Calendar, ChevronDown, Route, Fuel, Clock, 
  TrendingUp, TrendingDown, Minus 
} from 'lucide-react';

// DATOS MOCK (Para cuando no hay CSV)
const MOCK_SCATTER = [
  { km: 120, litros: 40, tipo: 'Tractor' },
  { km: 350, litros: 110, tipo: 'Tractor' },
  { km: 450, litros: 150, tipo: 'Tractor' },
  { km: 200, litros: 45, tipo: 'Utilitario' },
  { km: 800, litros: 220, tipo: 'Tractor' },
  { km: 150, litros: 20, tipo: 'Utilitario' },
  { km: 600, litros: 180, tipo: 'Tractor' },
];

const MOCK_DRIVERS = [
  { id: 1, nombre: 'Juan Pérez', vehiculo: 'JD 8R 370', dist: '1,200 km', horas: '142 h', estado: 'active' },
  { id: 2, nombre: 'Ana Gómez', vehiculo: 'JD 6R 155', dist: '1,150 km', horas: '110 h', estado: 'warning' },
  { id: 3, nombre: 'Carlos Ruiz', vehiculo: 'Cosechadora S780', dist: '980 km', horas: '95 h', estado: 'inactive' },
];

const KPICard = ({ title, value, unit, icon: Icon, trend, percent, color }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start hover:border-jd-green/30 transition-colors">
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <h3 className="text-3xl font-extrabold text-gray-800">{value}</h3>
        <span className="text-gray-400 font-bold text-lg">{unit}</span>
      </div>
      <div className={`mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
        trend === 'up' ? 'bg-green-100 text-green-700' : 
        trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
      }`}>
        {trend === 'up' ? <TrendingUp size={12}/> : trend === 'down' ? <TrendingDown size={12}/> : <Minus size={12}/>}
        {percent} vs mes anterior
      </div>
    </div>
    <div className={`p-3 rounded-lg bg-gray-50 text-gray-600`}>
      <Icon size={24} />
    </div>
  </div>
);

const EfficiencyPage = ({ data }) => {
  const hasData = data && data.length > 0;

  // Si hay datos reales, simulamos KM y Horas para el gráfico
  const scatterData = hasData 
    ? data.slice(0, 20).map(d => ({
        km: Math.floor(d.litros * (Math.random() * (4 - 2) + 2)), // Simulación: 2-4 km/l
        litros: d.litros,
        tipo: 'Tractor'
      }))
    : MOCK_SCATTER;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tablero de Eficiencia</h1>
          <p className="text-gray-500 mt-1">Analiza métricas de rendimiento y consumo de combustible de la maquinaria.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 mb-1 ml-1">Rango de Fecha</span>
            <div className="relative">
              <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-jd-green shadow-sm w-40 cursor-pointer">
                <option>Últimos 30 días</option>
                <option>Este Trimestre</option>
                <option>Este Año</option>
              </select>
              <Calendar className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 mb-1 ml-1">Tipo de Vehículo</span>
            <div className="relative">
              <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-jd-green shadow-sm w-40 cursor-pointer">
                <option>Todos</option>
                <option>Tractores (8R)</option>
                <option>Cosechadoras</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          <button className="mt-auto h-[42px] px-4 bg-jd-green hover:bg-green-800 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <Download size={18} /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Distancia Total" 
          value={hasData ? "15,240" : "12,450"} 
          unit="km" 
          icon={Route} 
          trend="up" 
          percent="+12.5%" 
        />
        <KPICard 
          title="Eficiencia Promedio" 
          value="3.2" 
          unit="KM/L" 
          icon={Fuel} 
          trend="down" 
          percent="-1.2%" 
        />
        <KPICard 
          title="Horas de Motor" 
          value="840" 
          unit="h" 
          icon={Clock} 
          trend="neutral" 
          percent="Estable" 
        />
      </div>

      {/* Main Grid: Chart + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Chart & Table */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Scatter Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Odómetro vs. Consumo</h3>
                        <p className="text-sm text-gray-400">Correlación entre distancia recorrida y uso de combustible.</p>
                    </div>
                    <div className="flex gap-4 text-xs font-medium text-gray-500">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-jd-green"></span> Tractores</div>
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Utilitarios</div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="80%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis type="number" dataKey="km" name="Distancia" unit="km" tick={{fontSize: 12, fill: '#9CA3AF'}} tickLine={false} axisLine={false} />
                        <YAxis type="number" dataKey="litros" name="Litros" unit="L" tick={{fontSize: 12, fill: '#9CA3AF'}} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                        <Scatter name="Maquinaria" data={scatterData} fill="#367C2B" />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {/* Drivers Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Conductores con Mayor Uso</h3>
                    <button className="text-sm text-jd-green font-bold hover:underline">Ver Todos</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4 pl-6">Conductor</th>
                            <th className="p-4">Vehículo</th>
                            <th className="p-4 text-right">Distancia</th>
                            <th className="p-4 text-right">Horas</th>
                            <th className="p-4 text-center pr-6">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {MOCK_DRIVERS.map((driver) => (
                            <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 pl-6 flex items-center gap-3">
                                    <img src={`https://i.pravatar.cc/150?img=${driver.id + 10}`} className="w-8 h-8 rounded-full bg-gray-200" alt="" />
                                    <span className="font-bold text-gray-800">{driver.nombre}</span>
                                </td>
                                <td className="p-4 text-gray-500">{driver.vehiculo}</td>
                                <td className="p-4 text-right font-mono font-medium">{driver.dist}</td>
                                <td className="p-4 text-right font-mono text-gray-500">{driver.horas}</td>
                                <td className="p-4 text-center pr-6">
                                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                                        driver.estado === 'active' ? 'bg-jd-green shadow-[0_0_8px_rgba(54,124,43,0.5)]' : 
                                        driver.estado === 'warning' ? 'bg-yellow-400' : 'bg-gray-300'
                                    }`}></span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-green-50 rounded-lg text-jd-green">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800 leading-tight">Eficiencia de Combustible</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Mejores Rendimientos (KM/L)</p>
                </div>
            </div>

            <div className="flex flex-col gap-8 flex-1">
                {[
                    { id: 'JD 8R 410', val: 4.5, driver: 'Juan Pérez', rank: 1, color: '#ffbf00' },
                    { id: 'JD 6R Utility', val: 4.2, driver: 'Ana Gómez', rank: 2, color: '#C0C0C0' },
                    { id: 'JD 7R 330', val: 3.9, driver: 'Carlos Ruiz', rank: 3, color: '#cd7f32' },
                    { id: 'JD 9R 590', val: 3.4, driver: 'Sistema', rank: 4, color: '#e5e7eb', textColor: 'text-gray-500' }
                ].map((item, idx, arr) => (
                    <div key={idx} className="relative pl-8 group">
                        {/* Line connector */}
                        {idx !== arr.length - 1 && (
                            <div className="absolute left-3 top-7 bottom-[-2rem] w-px bg-gray-100"></div>
                        )}
                        
                        {/* Rank Badge */}
                        <div 
                            className="absolute left-0 top-1 w-6 h-6 text-white text-xs font-bold flex items-center justify-center rounded-full shadow-sm z-10"
                            style={{ backgroundColor: item.rank > 3 ? '#fff' : item.color, color: item.rank > 3 ? '#9ca3af' : '#fff', border: item.rank > 3 ? '1px solid #e5e7eb' : 'none' }}
                        >
                            {item.rank}
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-gray-800">{item.id}</span>
                                <span className={`font-black text-lg ${item.textColor || 'text-jd-green'}`}>{item.val}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full ${item.rank > 3 ? 'bg-gray-400' : 'bg-jd-green'}`} 
                                    style={{ width: `${(item.val / 5) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-400">Conductor: {item.driver}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-sartor-gray rounded-lg border border-dashed border-gray-300">
                <div className="flex gap-2 text-jd-green mb-2">
                    <span className="font-bold text-xs uppercase">💡 Consejo de Eficiencia</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                    Reducir el tiempo de ralentí un 10% en la serie 9R podría ahorrar aprox. 150L de combustible este mes.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default EfficiencyPage;