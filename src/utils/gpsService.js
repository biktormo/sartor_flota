// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error de red: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    console.log("📡 DATOS DE FLOTA (GETLASTDATA):", json);

    let rawAssets = [];

    // Estrategia de búsqueda para la respuesta de GETLASTDATA
    // 1. Propiedades comunes: 'data', 'rows', 'items'
    if (json.data && Array.isArray(json.data)) rawAssets = json.data;
    else if (json.rows && Array.isArray(json.rows)) rawAssets = json.rows;
    else if (json.items && Array.isArray(json.items)) rawAssets = json.items;
    
    // 2. Si es un objeto de objetos (ej: {"1":{...}, "2":{...}})
    else if (typeof json === 'object' && !Array.isArray(json)) {
        rawAssets = Object.values(json).filter(item => item && (item.uID || item.n));
    }
    
    // 3. Si es un array directo
    else if (Array.isArray(json)) {
        rawAssets = json;
    }

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía. Revisa la estructura del JSON en la consola.");
    }

    // Mapeo flexible de campos
    return rawAssets.map(asset => ({
      id: asset.uID || asset.id,
      name: asset.n || asset.name || asset.alias || 'Sin Nombre',
      plate: asset.p || asset.plate || asset.n || ''
    })).filter(v => v.id); // Asegurar que todos tengan un ID

  } catch (error) {
    console.error("Error procesando flota GPS:", error);
    return [];
  }
};

// 2. Obtener distancia SIMPLE (Para Control GPS)
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
  try {
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromStr = format(dateFrom);
    const toStr = format(dateTo);
    
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    if (json.resumen && json.resumen.distancia) {
        return parseFloat(json.resumen.distancia);
    }
    return 0; 
  } catch (error) {
    console.error(`Error distancia GPS:`, error);
    return 0;
  }
};

// 3. Obtener Historial COMPLETO (Para Análisis GPS)
export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromDate = new Date(dateFrom); fromDate.setHours(0,0,0);
    const toDate = new Date(dateTo); toDate.setHours(23,59,59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    console.log(`📡 Pidiendo Historial Detallado: ${patente}`);

    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    console.log("📡 HISTORIAL RECIBIDO:", json);

    let totalDistance = 0;
    let routePoints = [];
    
    // Distancia
    if (json.resumen && json.resumen.distancia) {
      totalDistance = parseFloat(json.resumen.distancia);
    }

    // Puntos
    const dataPoints = json.filas || json.datos || (Array.isArray(json) ? json : []);
    
    if (dataPoints.length > 0) {
      if (totalDistance === 0) {
        const last = dataPoints[dataPoints.length - 1];
        if (last.distancia_acumulada) totalDistance = parseFloat(last.distancia_acumulada);
        else if (last.distancia) totalDistance = parseFloat(last.distancia);
      }
      
      routePoints = dataPoints
        .filter(p => (p.lat && p.lon) || (p.latitud && p.longitud))
        .map(p => {
            const lat = parseFloat(p.lat || p.latitud);
            const lng = parseFloat(p.lon || p.longitud || p.lng);
            return [lat, lng];
        });
    }

    return {
      totalDistance,
      routePoints,
      heatPoints: routePoints.map(p => [p[0], p[1], 1]), 
    };

  } catch (error) {
    console.error(`Error obteniendo historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// 4. Algoritmo de Mapeo
export const matchFleetData = (csvData, gpsAssets) => {
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
    
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv);

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate);
      const gpsName = clean(asset.name);

      if (gpsPlaca.length > 2 && csvPlaca.length > 2 && gpsPlaca === csvPlaca) return true;
      if (csvUnidad.length > 0 && gpsName.includes(csvUnidad)) return true;
      
      return false;
    });

    matchedData.push({
      unidad: unidadCsv,
      placa: csvInfo.placa,
      litrosCsv: csvInfo.litros,
      costoCsv: csvInfo.costo,
      gpsId: gpsAsset ? (gpsAsset.id || gpsAsset.plate) : null, // ID para búsqueda
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsSearchKey: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null, 
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};