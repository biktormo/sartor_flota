// src/utils/gpsService.js

export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    console.log("📡 API GETVEHICULOS:", json);

    // --- CORRECCIÓN FINAL: Leer 'unidades' ---
    const rawAssets = json.unidades || [];

    if (!Array.isArray(rawAssets) || rawAssets.length === 0) {
        console.warn("⚠️ No se encontraron vehículos en la propiedad 'unidades'.");
        return [];
    }

    return rawAssets.map(asset => {
      // Mapeo según los campos que vemos en la consola:
      return {
        id: asset.id_gps, // <-- El ID único parece ser 'id_gps'
        name: asset.alias, // <-- El nombre es 'alias' ("MOVIL 44 - AE822VW")
        plate: asset.patente // <-- La patente es 'patente'
      };
    });

  } catch (error) {
    console.error("Error procesando flota GPS:", error);
    return [];
  }
};

export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
  try {
    // Formato exacto doc: "yyyy-mm-dd hh:mm:ss"
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromStr = format(dateFrom);
    const toStr = format(dateTo);
    
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    // Buscar distancia en respuesta de historial
    // Ajustar si la API devuelve estructura diferente
    if (json.resumen && json.resumen.distancia) return parseFloat(json.resumen.distancia);
    
    // Si devuelve lista de puntos en 'datos'
    if (json.datos && Array.isArray(json.datos) && json.datos.length > 0) {
        // A veces el último tiene el total acumulado
        const last = json.datos[json.datos.length - 1];
        if (last.distancia_acumulada) return parseFloat(last.distancia_acumulada);
        if (last.distancia) return parseFloat(last.distancia);
    }
    
    return 0; 
  } catch (error) {
    console.error(`Error distancia GPS:`, error);
    return 0;
  }
};

export const matchFleetData = (csvData, gpsAssets) => {
  const matchedData = [];
  const csvSummary = {};
  let minDate = new Date();
  let maxDate = new Date(0);

  // Agrupar CSV
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

  // Cruzar datos
  Object.keys(csvSummary).forEach(unidadCsv => {
    const csvInfo = csvSummary[unidadCsv];
    
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv);

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate);
      const gpsName = clean(asset.name);

      // 1. Coincidencia Patente
      if (gpsPlaca.length > 2 && csvPlaca.length > 2 && gpsPlaca === csvPlaca) return true;
      
      // 2. Coincidencia Nombre (ej: "MOVIL 25" contiene "25")
      if (csvUnidad.length > 0 && gpsName.includes(csvUnidad)) return true;
      
      return false;
    });

    matchedData.push({
      unidad: unidadCsv,
      placa: csvInfo.placa,
      litrosCsv: csvInfo.litros,
      costoCsv: csvInfo.costo,
      gpsId: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null, // Usamos Patente preferentemente para historial
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};