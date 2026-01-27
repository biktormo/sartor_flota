import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, FileSearch, ArrowRight, CheckCircle, 
  Tractor, Calendar, MapPin, Search 
} from 'lucide-react';

const GapsPage = ({ data }) => {
  const [selectedUnit, setSelectedUnit] = useState('');

  // 1. Obtener lista de unidades para el selector
  const uniqueUnits = useMemo(() => {
    if (!data) return [];
    const units = new Set(data.map(r => r.unidad));
    return Array.from(units).sort();
  }, [data]);

  // 2. Lógica Core: Análisis de Saltos
  const auditReport = useMemo(() => {
    if (!selectedUnit || !data) return null;

    // A. Filtrar solo la unidad seleccionada
    const unitData = data.filter(row => row.unidad === selectedUnit);

    // B. Ordenar CRONOLÓGICAMENTE (Crucial)
    // Asumimos formato DD/MM/YYYY HH:mm:ss o similar.
    // Si dataProcessor ya normalizó la fecha, genial. Si no, parseamos aquí.
    const sortedData = unitData.sort((a, b) => {
      // Helper para parsear fechas complejas si vienen como string
      const getTime = (dateVal) => {
        if (dateVal instanceof Date) return dateVal.getTime();
        // Intento básico de parseo si es string
        const parts = dateVal.split(/[\/\s:]/); // separar por / espacio o :
        if (parts.length >= 3) {
           // Asumiendo DD/MM/YYYY HH:mm
           return new Date(parts[2], parts[1]-1, parts[0], parts[3]||0, parts[4]||0).getTime();
        }
        return 0; 
      };
      return getTime(a.fecha) - getTime(b.fecha);
    });

    // C. Detectar Saltos
    let totalSaltosKm = 0;
    let totalSaltosCount = 0;
    const processedRows = [];

    sortedData.forEach((current, index) => {
      let salto = 0;
      let isGap = false;
      let prevOdoEnd = 0;

      if (index > 0) {
        const previous = sortedData[index - 1];
        prevOdoEnd = previous.odoUlt;
        const currentOdoStart = current.odoAnt;

        // Validamos que los odómetros no sean 0 (errores de carga)
        if (prevOdoEnd > 0 && currentOdoStart > 0) {
          // El salto es la diferencia entre donde terminó el anterior y donde empezó este
          const diff = currentOdoStart - prevOdoEnd;
          
          // Tolerancia de 2km por movimientos internos en playa
          if (diff > 2) {
            salto = diff;
            isGap = true;
            totalSaltosKm += diff;
            totalSaltosCount++;
          }
        }
      }

      processedRows.push({
        ...current,
        isGap,
        salto,
        prevOdoEnd // Guardamos esto para mostrarlo en la UI
      });
    });

    return {
      rows: processedRows,
      totalSaltosKm,
      totalSaltosCount,
      totalRegistros: sortedData.length
    };

  }, [data, selectedUnit]);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FileSearch className="text-jd-green" size={32} />
            Auditoría de Diferencias
          </h1>
          <p className="text-gray-500 mt-1">Detecta cargas de combustible realizadas fuera del sistema (saltos de odómetro).</p>
        </div>

        {/* Selector de Unidad */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select 
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-jd-green focus:border-transparent shadow-sm w-64 appearance-none cursor-pointer"
          >
            <option value="">-- Seleccionar Unidad --</option>
            {uniqueUnits.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedUnit && auditReport ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Tractor size={24}/></div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Unidad Analizada</p>
                <h3 className="text-2xl font-black text-gray-800">{selectedUnit}</h3>
              </div>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm flex items-center gap-4 ${auditReport.totalSaltosCount > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className={`p-3 rounded-lg ${auditReport.totalSaltosCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {auditReport.totalSaltosCount > 0 ? <AlertTriangle size={24}/> : <CheckCircle size={24}/>}
              </div>
              <div>
                <p className={`text-xs font-bold uppercase ${auditReport.totalSaltosCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  Km Fuera de Sistema
                </p>
                <h3 className={`text-2xl font-black ${auditReport.totalSaltosCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {auditReport.totalSaltosKm.toLocaleString('es-AR')} km
                </h3>
                <p className="text-xs opacity-70">{auditReport.totalSaltosCount} incidentes detectados</p>
              </div>
            </div>
          </div>

          {/* Tabla de Auditoría */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-700 text-sm">Historial de Continuidad</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-4 pl-6">Fecha</th>
                    <th className="p-4">Estación</th>
                    <th className="p-4 text-right bg-gray-50/50">Cierre Anterior</th>
                    <th className="p-4 text-center"><ArrowRight size={16} className="mx-auto text-gray-300"/></th>
                    <th className="p-4 text-right bg-blue-50/30 font-bold text-gray-700">Inicio Actual</th>
                    <th className="p-4 text-right">Fin Actual</th>
                    <th className="p-4 text-right pr-6">Análisis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditReport.rows.map((row, idx) => (
                    <tr key={idx} className={`transition-colors ${row.isGap ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                      <td className="p-4 pl-6 text-gray-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400"/> {row.fecha}
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs truncate max-w-[200px]" title={row.estacion}>
                        <div className="flex items-center gap-1">
                          <MapPin size={12}/> {row.estacion}
                        </div>
                      </td>
                      
                      {/* Lógica Visual de Comparación */}
                      <td className="p-4 text-right font-mono text-gray-400 bg-gray-50/50">
                        {idx === 0 ? '-' : row.prevOdoEnd.toLocaleString()}
                      </td>
                      
                      <td className="p-4 text-center">
                        {row.isGap ? (
                          <div className="w-full h-0.5 bg-red-300 relative">
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-600 bg-red-100 px-1 rounded">
                              Salto
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-px bg-gray-200"></div>
                        )}
                      </td>

                      <td className={`p-4 text-right font-mono font-bold bg-blue-50/30 ${row.isGap ? 'text-red-600' : 'text-gray-700'}`}>
                        {row.odoAnt.toLocaleString()}
                      </td>
                      
                      <td className="p-4 text-right font-mono text-gray-600">
                        {row.odoUlt.toLocaleString()}
                      </td>

                      <td className="p-4 text-right pr-6">
                        {row.isGap ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                            <AlertTriangle size={12} />
                            +{row.salto.toLocaleString()} km
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                            <CheckCircle size={12}/> Continuo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
          <Tractor size={48} className="mb-4 opacity-20" />
          <p>Selecciona una unidad arriba para auditar sus odómetros.</p>
        </div>
      )}
    </div>
  );
};

export default GapsPage;