// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    
    if (!response.ok) {
        throw new Error(`Error red: ${response.status}`);
    }

    const json = await response.json();
    console.log("📡 API GETVEHICULOS (RAW):", json);

    let rawAssets = [];

    // ESTRATEGIA DE BÚSQUEDA ROBUSTA
    if (Array.isArray(json)) {
        rawAssets = json;
    }
    else if (json.unidades && Array.isArray(json.unidades)) {
        rawAssets = json.unidades;
    }
    else if (json.datos && Array.isArray(json.datos)) {
        rawAssets = json.datos;
    }
    // Caso: Respuesta de 'INITIALIZE' (tu caso actual)
    else if (json.loginPositions && Array.isArray(json.loginPositions)) {
        rawAssets = json.loginPositions;
    }
    else if (json.data) {
        if (Array.isArray(json.data)) rawAssets = json.data;
        else if (json.data.units) rawAssets = json.data.units;
    }

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía.");
    }

    return rawAssets.map(asset => {
      // Normalizar datos
      // En loginPositions: uID, n (nombre), p (patente)
      return {
        id: asset.uID || asset.id || asset.id_gps || asset.unitID,
        name: asset.n || asset.name || asset.alias || asset.dsc || 'Sin Nombre',
        plate: asset.p || asset.plate || asset.patente || asset.n || ''
      };
    }).filter(v => v.id);

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener Historial Completo (Para Mapas y Cálculos)
export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromDate = new Date(dateFrom); fromDate.setHours(0, 0, 0);
    const toDate = new Date(dateTo); toDate.setHours(23, 59, 59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    let totalDistance = 0;
    let routePoints = [];
    
    // 1. Distancia en resumen
    if (json.resumen && json.resumen.distancia) {
      totalDistance = parseFloat(json.resumen.distancia);
    } else if (json.totales && json.totales.distancia) {
      totalDistance = parseFloat(json.totales.distancia);
    }

    // 2. Puntos
    const dataPoints = json.filas || json.datos || json.result || (Array.isArray(json) ? json : []);
    
    if (dataPoints.length > 0) {
      if (totalDistance === 0) {
        const lastPoint = dataPoints[dataPoints.length - 1];
        if (lastPoint.distancia_acumulada) totalDistance = parseFloat(lastPoint.distancia_acumulada);
        else if (lastPoint.distancia) totalDistance = parseFloat(lastPoint.distancia);
      }
      
      routePoints = dataPoints
        .filter(p => (p.lat && p.lon) || (p.y && p.x))
        .map(p => {
            const lat = parseFloat(p.lat || p.y);
            const lng = parseFloat(p.lon || p.x);
            return [lat, lng];
        });
    }

    return {
      totalDistance,
      routePoints,
      heatPoints: routePoints.map(p => [p[0], p[1], 1]), 
    };

  } catch (error) {
    console.error(`Error historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// 3. Obtener Distancia Simple (Wrapper para la página de comparación)
// ESTA ES LA FUNCIÓN QUE FALTABA Y CAUSABA EL ERROR
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    const data = await fetchGpsHistory(assetId, dateFrom, dateTo);
    return data.totalDistance;
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
      gpsId: gpsAsset ? (gpsAsset.id || gpsAsset.plate) : null, 
      gpsName: gpsAsset ? gpsAsset.name : null,
      // Para historial usamos ID si es numérico o Patente si es string, depende de la API
      // En tu caso 'id_gps' parecía ser el ID numérico
      gpsSearchKey: gpsAsset ? gpsAsset.id : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};