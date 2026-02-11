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

    // --- ESTRATEGIA DE BÚSQUEDA ROBUSTA ---
    
    // 1. Caso: Respuesta directa de lista (ej: [{id:...}, {id:...}])
    if (Array.isArray(json)) {
        rawAssets = json;
    }
    // 2. Caso: Respuesta de 'GETLASTDATA' o similar (propiedad 'unidades' o 'datos')
    else if (json.unidades && Array.isArray(json.unidades)) {
        rawAssets = json.unidades;
    }
    else if (json.datos && Array.isArray(json.datos)) {
        rawAssets = json.datos;
    }
    // 3. Caso: Respuesta de 'INITIALIZE' (propiedad 'loginPositions') << ESTE ES TU CASO ACTUAL
    else if (json.loginPositions && Array.isArray(json.loginPositions)) {
        console.log("✅ Encontrados vehículos en 'loginPositions'");
        rawAssets = json.loginPositions;
    }
    // 4. Caso: Respuesta anidada en 'data'
    else if (json.data) {
        if (Array.isArray(json.data)) rawAssets = json.data;
        else if (json.data.units) rawAssets = json.data.units;
    }

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía. No se pudo encontrar el array de vehículos en el JSON.");
    }

    // Normalizar los datos (Mapeo flexible)
    return rawAssets.map(asset => {
        // ID: 'uID', 'id', 'id_gps', 'unitID'
        const id = asset.uID || asset.id || asset.id_gps || asset.unitID;
        
        // Nombre: 'n', 'name', 'alias', 'dsc'
        const name = asset.n || asset.name || asset.alias || asset.dsc || 'Sin Nombre';
        
        // Patente: 'p', 'plate', 'patente'. Si no hay, usar nombre o ID.
        // Nota: En 'loginPositions', la patente suele venir en 'p' o 'n'
        const plate = asset.p || asset.plate || asset.patente || asset.n || '';

        return {
            id: id,
            name: name,
            plate: plate
        };
    }).filter(v => v.id); // Filtrar si alguno quedó sin ID

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener historial de recorrido (Se mantiene igual)
export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    // Asegurar rango completo
    const fromDate = new Date(dateFrom); fromDate.setHours(0, 0, 0);
    const toDate = new Date(dateTo); toDate.setHours(23, 59, 59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    console.log(`📡 Pidiendo Historial: ${patente}`);

    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    // Debug del historial
    // console.log("Historial RAW:", json);

    let totalDistance = 0;
    let routePoints = [];
    
    // Buscar distancia en resumen
    if (json.resumen && json.resumen.distancia) {
      totalDistance = parseFloat(json.resumen.distancia);
    }

    // Buscar puntos
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
    console.error(`Error obteniendo historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// 3. Match Fleet Data (Se mantiene igual)
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
      gpsSearchKey: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};