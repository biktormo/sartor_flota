// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
    try {
      const response = await fetch('/.netlify/functions/cybermapa?endpoint=assets');
      const json = await response.json();
      
      // Cybermapa suele devolver un array en una propiedad data o root. Ajustar según respuesta real.
      // Asumimos que devuelve un array directo o dentro de 'datos'
      const rawAssets = Array.isArray(json) ? json : (json.datos || []);
  
      // Normalizamos para nuestra app
      return rawAssets.map(asset => ({
        id: asset.id_movil || asset.patente, // Ajustar según lo que venga
        name: asset.alias || asset.nombre || asset.patente,
        plate: asset.patente
      }));
    } catch (error) {
      console.error("Error obteniendo vehículos GPS:", error);
      return [];
    }
  };
  
  // 2. Obtener distancia recorrida
  export const fetchGpsDistance = async (patente, dateFrom, dateTo) => {
    try {
      // Formatear fechas para Cybermapa: YYYY-MM-DD HH:MM:SS
      // toISOString devuelve "2025-01-21T15:00:00.000Z", hay que limpiarla
      const format = (d) => d.toISOString().replace('T', ' ').substring(0, 19);
      
      const fromStr = format(dateFrom);
      const toStr = format(dateTo);
      
      const response = await fetch(`/.netlify/functions/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
      const json = await response.json();
      
      // Aquí Cybermapa devolverá un historial de puntos.
      // Debemos sumar las distancias o leer el campo "distancia_recorrida" si lo trae el resumen.
      // Lógica simplificada:
      if (json.resumen && json.resumen.distancia) {
          return parseFloat(json.resumen.distancia);
      }
      
      // Si devuelve array de puntos, calculamos (complejo) o devolvemos 0 por ahora
      return 0; 
  
    } catch (error) {
      console.error("Error distancia GPS:", error);
      return 0;
    }
  };
  
  // ... (matchFleetData queda igual) ...
  export const matchFleetData = (csvData, gpsAssets) => {
    // ... Copia la lógica anterior de matchFleetData aquí ...
    // Solo asegúrate de usar 'gpsAsset.plate' para comparar
    const matchedData = [];
    const csvSummary = {};
    let minDate = new Date();
    let maxDate = new Date(0);
  
    csvData.forEach(row => {
      if (!csvSummary[row.unidad]) {
        csvSummary[row.unidad] = { litros: 0, costo: 0, placa: row.placa };
      }
      csvSummary[row.unidad].litros += row.litros;
      csvSummary[row.unidad].costo += row.costo;
  
      const rowDate = row.timestamp ? new Date(row.timestamp) : new Date();
      if (rowDate < minDate) minDate = rowDate;
      if (rowDate > maxDate) maxDate = rowDate;
    });
  
    Object.keys(csvSummary).forEach(unidadCsv => {
      const csvInfo = csvSummary[unidadCsv];
      
      const gpsAsset = gpsAssets.find(asset => {
        // Normalizar patentes (quitar guiones y espacios)
        const cleanPlateGPS = asset.plate ? asset.plate.replace(/[^a-zA-Z0-9]/g, '') : '';
        const cleanPlateCSV = csvInfo.placa ? csvInfo.placa.replace(/[^a-zA-Z0-9]/g, '') : '';
        
        // Coincidencia exacta de patente
        if (cleanPlateGPS && cleanPlateCSV && cleanPlateGPS === cleanPlateCSV) return true;
        
        // Coincidencia por nombre de unidad (si el alias en GPS es "Móvil 25")
        if (asset.name && asset.name.includes(unidadCsv)) return true;
        
        return false;
      });
  
      matchedData.push({
        unidad: unidadCsv,
        placa: csvInfo.placa,
        litrosCsv: csvInfo.litros,
        gpsId: gpsAsset ? gpsAsset.id : null,
        gpsPlate: gpsAsset ? gpsAsset.plate : null, // Importante para pedir historial
        gpsName: gpsAsset ? gpsAsset.name : 'No vinculado',
        gpsDistance: 0,
        rendimientoReal: 0
      });
    });
  
    return { matchedData, dateRange: { min: minDate, max: maxDate } };
  };