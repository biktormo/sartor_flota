// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    console.log("📡 API DATOSACTUALES (RAW):", json);

    let rawAssets = [];

    // Estrategia de búsqueda para WService.js
    if (Array.isArray(json)) {
        rawAssets = json;
    } else if (json.datos && Array.isArray(json.datos)) {
        rawAssets = json.datos;
    } else if (json.result && Array.isArray(json.result)) {
        rawAssets = json.result;
    }

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía. Ver consola.");
    }

    return rawAssets.map(asset => ({
      // Mapeo basado en documentación de StreetZ/WService
      id: asset.gps || asset.id_gps || asset.id, 
      name: asset.alias || asset.descripcion || asset.nombre || 'Sin Nombre',
      plate: asset.patente || asset.placa || '' 
    })).filter(a => a.id); // Solo devolvemos los que tienen ID

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener Historial (Cálculo de Distancia + Puntos)
export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    // Formato exacto doc: "yyyy-mm-dd hh:mm:ss"
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromDate = new Date(dateFrom); fromDate.setHours(0,0,0);
    const toDate = new Date(dateTo); toDate.setHours(23,59,59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    console.log(`📡 Pidiendo Historial ID: ${patente}`);

    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    console.log("📡 HISTORIAL RECIBIDO:", json);

    let totalDistance = 0;
    let routePoints = [];

    // --- PARSEO DATOSHISTORICOS ---
    
    // 1. Distancia Total (Resumen)
    if (json.resumen && json.resumen.distancia) {
      totalDistance = parseFloat(json.resumen.distancia);
    }

    // 2. Puntos del mapa (Posiciones)
    // La doc dice 'posiciones', a veces es 'datos'
    const dataPoints = json.posiciones || json.datos || json.filas || [];
    
    if (Array.isArray(dataPoints) && dataPoints.length > 0) {
      
      // Si no hay resumen, intentamos sacar distancia del último punto
      if (totalDistance === 0) {
         const last = dataPoints[dataPoints.length-1];
         // Buscamos acumulado
         if (last.distancia_acumulada) totalDistance = parseFloat(last.distancia_acumulada);
         // O calculamos manual (sumando tramos) - Omitido por simplicidad, priorizamos API
      }

      // Mapear Latitud/Longitud (latitud/longitud según doc)
      routePoints = dataPoints
        .filter(p => (p.latitud && p.longitud) || (p.lat && p.lon))
        .map(p => {
            const lat = parseFloat(p.latitud || p.lat);
            const lng = parseFloat(p.longitud || p.lon);
            return [lat, lng];
        });
    }

    return {
      totalDistance: Math.max(0, totalDistance),
      routePoints,
      heatPoints: routePoints.map(p => [p[0], p[1], 1]), 
    };

  } catch (error) {
    console.error(`Error historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// 3. Obtener Distancia Simple
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    const data = await fetchGpsHistory(assetId, dateFrom, dateTo);
    return data.totalDistance;
};

// 4. Mapeo de Flota
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
      gpsId: gpsAsset ? gpsAsset.id : null,
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsSearchKey: gpsAsset ? gpsAsset.id : null, // ID numérico para historial
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};