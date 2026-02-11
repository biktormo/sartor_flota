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

    // En tu captura, la lista está en la propiedad 'unidades'
    const rawAssets = json.unidades || json.datos || [];

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía.");
    }

    return rawAssets.map(asset => ({
      // --- CORRECCIÓN DE MAPEO SEGÚN TU CAPTURA ---
      id: asset.gps || asset.id,            // El ID es 'gps' (ej: "86528...")
      name: asset.alias || asset.patente,   // El nombre es 'alias' (ej: "MOVIL 35...")
      plate: asset.patente || ''            // La patente es 'patente' (ej: "AA472RQ")
      // --------------------------------------------
    }));

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener historial de recorrido
export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    // Formato requerido: "yyyy-mm-dd hh:mm:ss"
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    // Aseguramos cubrir el día completo si viene de un date-picker
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0);
    
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    console.log(`📡 Pidiendo Historial: ${patente} | ${fromStr} a ${toStr}`);

    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    console.log("📡 HISTORIAL RECIBIDO:", json);

    // Procesamos la respuesta para devolver un objeto útil
    let totalDistance = 0;
    let routePoints = [];
    
    // 1. Intentar leer distancia del resumen
    if (json.resumen && json.resumen.distancia) {
      totalDistance = parseFloat(json.resumen.distancia);
    }

    // 2. Buscar los puntos (coordenadas)
    // En Cybermapa, suelen venir en 'filas', 'datos' o directamente en el root si es un array
    const dataPoints = json.filas || json.datos || (Array.isArray(json) ? json : []);
    
    if (dataPoints.length > 0) {
      // Si no había resumen, calculamos distancia del último punto (si tiene acumulado)
      if (totalDistance === 0) {
        const lastPoint = dataPoints[dataPoints.length - 1];
        if (lastPoint.distancia_acumulada) {
            totalDistance = parseFloat(lastPoint.distancia_acumulada);
        } else if (lastPoint.distancia) {
            totalDistance = parseFloat(lastPoint.distancia);
        }
      }
      
      // Extraemos coordenadas para el mapa
      // Buscamos latitud/longitud en campos comunes (lat/lon, x/y, latitud/longitud)
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
      // Puntos para mapa de calor [lat, lng, intensidad]
      heatPoints: routePoints.map(p => [p[0], p[1], 1]), 
    };

  } catch (error) {
    console.error(`Error obteniendo historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// 3. Algoritmo de Mapeo (Cruzar CSV con GPS)
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
    
    // Normalizar
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv);

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate);
      const gpsName = clean(asset.name);

      // Coincidencia
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
      // IMPORTANTE: Para el historial pasamos la PATENTE si existe, o el ID
      gpsSearchKey: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};