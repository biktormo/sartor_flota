import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, FileSearch, ArrowRight, CheckCircle, 
  Tractor, Calendar, MapPin, Search, Info 
} from 'lucide-react';

const GapsPage = ({ data }) => {
  const [selectedUnit, setSelectedUnit] = useState('');

  // 1. Obtener lista de unidades
  const uniqueUnits = useMemo(() => {
    if (!data) return [];
    const units = new Set(data.filter(r => r.unidad && r.unidad !== 'Desconocido').map(r => r.unidad));
    return Array.from(units).sort((a, b) => a.toString().localeCompare(b.toString()));
  }, [data]);

  // 2. Lógica Core: Análisis de Saltos y Consistencia
  const auditReport = useMemo(() => {
    if (!selectedUnit || !data) return null;

    // A. Filtrar unidad
    const unitData = data.filter(row => row.unidad === selectedUnit);

    // B. Ordenar CRONOLÓGICAMENTE (USANDO TIMESTAMP PRECISO)
    const sortedData = unitData.sort((a, b) => a.timestamp - b.timestamp);

    // C. Detectar Anomalías
    let incidentesCount = 0;
    const processedRows = [];

    sortedData.forEach((current, index) => {
      let analysisType = 'OK'; // OK, GAP_CONTINUITY, GAP_DISTANCE
      let message = 'Continuo';
      let prevOdoEnd = 0;
      let rendimientoCalculado = 0;
      let litrosAnteriores = 0;
      
      const distanciaTramo = current.distancia;

      // --- LOGICA DE RENDIMIENTO (Carga Anterior) ---
      if (index > 0) {
        const previous = sortedData[index - 1];
        prevOdoEnd = previous.odoUlt;
        litrosAnteriores = previous.litros; 

        // Calcular Rendimiento: Distancia Actual / Litros Anteriores
        if (litrosAnteriores > 0) {
            rendimientoCalculado = distanciaTramo / litrosAnteriores;
        }

        // --- VALIDACIÓN 1: CONTINUIDAD (Salto de "Costura") ---
        // Chequear si el odómetro retrocedió o saltó adelante
        if (prevOdoEnd > 0 && current.odoAnt > 0) {
          const diff = current.odoAnt - prevOdoEnd;
          
          if (Math.abs(diff) > 5) { // Tolerancia 5km
            analysisType = 'GAP_CONTINUITY';
            
            if (diff < 0) {
               message = `Error Cronológico: Odómetro retrocedió ${Math.abs(diff).toLocaleString('es-AR')} km`;
            } else {
               message = `Salto de ${diff.toLocaleString('es-AR')} km entre cargas`;
            }
            incidentesCount++;
          }
        }
      }

      // --- VALIDACIÓN 2: AUTONOMÍA (Salto Interno) ---
      if (analysisType === 'OK') { 
        // Criterio 1: Distancia absoluta muy grande para un tanque
        if (distanciaTramo > 1000) { 
          analysisType = 'GAP_DISTANCE';
          message = `Recorrido excesivo (${distanciaTramo.toLocaleString()} km). Posible carga externa.`;
          incidentesCount++;
        } 
        // Criterio 2: Rendimiento irreal
        else if (index > 0 && rendimientoCalculado > 18) {
           analysisType = 'GAP_DISTANCE';
           message = `Rendimiento irreal (${rendimientoCalculado.toFixed(1)} km/L). Falta carga intermedia.`;
           incidentesCount++;
        }
      }

      processedRows.push({
        ...current,
        distanciaTramo,
        rendimientoCalculado,
        litrosAnteriores,
        prevOdoEnd,
        analysisType,
        message
      });
    });

    return {
      rows: processedRows,
      incidentesCount,
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
          <p className="text-gray-500 mt-1">Detecta inconsistencias de odómetro y cargas no reportadas en el sistema.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Tractor size={24}/></div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Unidad Analizada</p>
                <h3 className="text-2xl font-black text-gray-800">{selectedUnit}</h3>
              </div>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm flex items-center gap-4 ${auditReport.incidentesCount > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className={`p-3 rounded-lg ${auditReport.incidentesCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {auditReport.incidentesCount > 0 ? <AlertTriangle size={24}/> : <CheckCircle size={24}/>}
              </div>
              <div>
                <p className={`text-xs font-bold uppercase ${auditReport.incidentesCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  Estado de Auditoría
                </p>
                <h3 className={`text-2xl font-black ${auditReport.incidentesCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {auditReport.incidentesCount > 0 ? `${auditReport.incidentesCount} Alertas` : 'Datos Consistentes'}
                </h3>
              </div>
            </div>
          </div>

          {/* Tabla de Auditoría */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-sm">Historial de Odómetros y Consumo</h3>
              <div className="flex gap-4 text-xs font-medium text-gray-500">
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Salto / Error Cronológico</span>
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Recorrido Excesivo</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-4 pl-6">Fecha y Hora</th>
                    <th className="p-4">Estación</th>
                    {/* Bloque Continuidad */}
                    <th className="p-4 text-right bg-gray-50/50 text-xs uppercase tracking-wider text-gray-400">Cierre Ant.</th>
                    <th className="p-4 text-right text-xs uppercase tracking-wider text-gray-400">Inicio Act.</th>
                    <th className="p-4 text-right">Fin Actual</th>
                    
                    {/* Bloque Consumo */}
                    <th className="p-4 text-right font-bold text-gray-700 bg-blue-50/30">Kms Rec.</th>
                    <th className="p-4 text-right text-xs text-gray-400">Lts (Ant.)</th>
                    <th className="p-4 text-center text-xs uppercase tracking-wider">Rend. (Km/L)</th>
                    
                    <th className="p-4 text-right pr-6">Análisis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditReport.rows.map((row, idx) => {
                    // Estilos
                    let rowBg = 'hover:bg-gray-50';
                    let statusBadge = 'bg-green-50 text-green-700 border-green-200';
                    let statusIcon = <CheckCircle size={12}/>;

                    if (row.analysisType === 'GAP_CONTINUITY') {
                        rowBg = 'bg-red-50 hover:bg-red-100';
                        statusBadge = 'bg-red-100 text-red-700 border-red-200';
                        statusIcon = <AlertTriangle size={12}/>;
                    } else if (row.analysisType === 'GAP_DISTANCE') {
                        rowBg = 'bg-orange-50 hover:bg-orange-100';
                        statusBadge = 'bg-orange-100 text-orange-800 border-orange-200';
                        statusIcon = <AlertCircle size={12}/>;
                    }

                    return (
                      <tr key={idx} className={`transition-colors ${rowBg}`}>
                        <td className="p-4 pl-6 text-gray-600 font-medium whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2"><Calendar size={14} className="text-gray-400"/> {row.fecha}</span>
                            <span className="text-xs text-gray-400 ml-6">{row.hora}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 text-xs truncate max-w-[150px]" title={row.estacion}>
                          {row.estacion}
                        </td>
                        
                        {/* Continuidad */}
                        <td className="p-4 text-right font-mono text-gray-400 bg-gray-50/50 text-xs">
                          {idx === 0 ? '-' : row.prevOdoEnd.toLocaleString('es-AR')}
                        </td>
                        <td className={`p-4 text-right font-mono text-xs ${row.analysisType === 'GAP_CONTINUITY' ? 'font-bold text-red-600' : 'text-gray-500'}`}>
                          {row.odoAnt.toLocaleString('es-AR')}
                        </td>
                        <td className="p-4 text-right font-mono text-gray-600">
                          {row.odoUlt.toLocaleString('es-AR')}
                        </td>

                        {/* Datos del Tramo */}
                        <td className="p-4 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                          {row.distanciaTramo.toLocaleString('es-AR')}
                        </td>
                        <td className="p-4 text-right text-gray-400 text-xs">
                          {idx > 0 ? `${row.litrosAnteriores.toLocaleString('es-AR')} L` : '-'}
                        </td>
                        <td className="p-4 text-center font-mono text-xs">
                           {idx > 0 && row.rendimientoCalculado > 0 ? (
                             <span className={`px-2 py-1 rounded ${row.rendimientoCalculado > 18 ? 'bg-orange-200 text-orange-800 font-bold' : 'bg-gray-100'}`}>
                               {row.rendimientoCalculado.toFixed(1)}
                             </span>
                           ) : '-'}
                        </td>

                        <td className="p-4 text-right pr-6">
                          <div className={`inline-flex items-center justify-end gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border w-full ${statusBadge}`}>
                            {statusIcon} <span className="truncate max-w-[150px]" title={row.message}>{row.message}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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