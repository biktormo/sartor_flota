import React, { useMemo, useState, useEffect } from 'react';
import { Users, Car, AlertCircle, Loader2 } from 'lucide-react';
import { fetchVehicleSettings } from '../utils/firebaseService';

const DriversPage = ({ data }) => {
  const [vehicleSettings, setVehicleSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // Cargar configuraciones de vehículos para mostrar marcas/modelos
  useEffect(() => {
    const load = async () => {
      const settings = await fetchVehicleSettings();
      setVehicleSettings(settings);
      setLoading(false);
    };
    load();
  }, []);

  const driversList = useMemo(() => {
    if (!data || data.length === 0) return [];

    const map = new Map();

    data.forEach(row => {
      const driverName = row.conductor || 'Sin Asignar';
      if (driverName === 'Sin Asignar' || driverName.trim() === '') return;

      if (!map.has(driverName)) {
        map.set(driverName, {
          name: driverName,
          vehicles: new Set(), // Usamos Set para que no se repitan unidades
          totalLitros: 0,
          totalCosto: 0,
          cargas: 0
        });
      }

      const driver = map.get(driverName);
      driver.vehicles.add(row.unidad);
      driver.totalLitros += row.litros;
      driver.totalCosto += row.costo;
      driver.cargas += 1;
    });

    // Convertir a array y enriquecer con datos de marca/modelo
    return Array.from(map.values())
      .map(d => {
        const vehiclesArray = Array.from(d.vehicles).map(unidad => {
          const config = vehicleSettings[unidad] || {};
          // Buscar marca/modelo en firebase o en el csv original (buscando una fila de esa unidad)
          let marca = config.marca || '';
          let modelo = config.modelo || '';
          
          if (!marca) {
             const sampleRow = data.find(r => r.unidad === unidad);
             if (sampleRow) {
                 marca = sampleRow.marca;
                 modelo = sampleRow.modelo;
             }
          }

          return {
            unidad,
            detalle: marca ? `${marca} ${modelo}` : 'Detalle no disponible'
          };
        });

        return { ...d, vehiclesDetails: vehiclesArray };
      })
      .sort((a, b) => b.totalLitros - a.totalLitros); // Ordenar por quien gasta más
  }, [data, vehicleSettings]);

  if (loading) return <div className="p-10 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2"/> Cargando conductores...</div>;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <Users size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Conductores</h1>
          <p className="text-gray-500">Historial de vehículos utilizados y consumo por conductor.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4 pl-6 w-1/4">Conductor</th>
                <th className="p-4 w-1/3">Vehículos Utilizados</th>
                <th className="p-4 text-right">Cargas</th>
                <th className="p-4 text-right">Consumo Total</th>
                <th className="p-4 text-right pr-6">Gasto Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {driversList.map((driver, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 pl-6 align-top">
                    <div className="font-bold text-gray-800 text-base">{driver.name}</div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-1">
                      {driver.vehiclesDetails.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                          <Car size={12} className="text-jd-green" />
                          <span className="font-bold">{v.unidad}</span>
                          <span className="text-gray-400">|</span>
                          <span>{v.detalle}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-gray-500 align-top">
                    {driver.cargas}
                  </td>
                  <td className="p-4 text-right font-bold text-jd-green align-top">
                    {driver.totalLitros.toLocaleString('es-AR')} L
                  </td>
                  <td className="p-4 text-right font-mono text-gray-700 pr-6 align-top">
                    ${driver.totalCosto.toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
              {driversList.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
                    No hay información de conductores disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DriversPage;