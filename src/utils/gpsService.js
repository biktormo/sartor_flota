// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    console.log("📡 API GETVEHICULOS:", json);

    // Búsqueda del array según tu captura exitosa anterior
    let rawAssets = [];
    if (json.unidades && Array.isArray(json.unidades)) {
        rawAssets = json.unidades;
    } else if (Array.isArray(json)) {
        rawAssets = json;
    }

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía o formato desconocido.");
        return [];
    }

    return rawAssets.map(asset => ({
      // MAPEO EXACTO SEGÚN TU CAPTURA DE PANTALLA:
      id: asset.gps,         // El ID numérico viene en el campo 'gps'
      name: asset.alias,     // El nombre viene en 'alias' (ej: "MOVIL 25...")
      plate: asset.patente   // La patente viene en 'patente'
    }));

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener Historial
export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    // Formato exacto para WService.js: "yyyy-mm-dd hh:mm:ss"
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    // Asegurar rango completo
    const fromDate = new Date(dateFrom); fromDate.setHours(0,0,0);
    const toDate = new Date(dateTo); toDate.setHours(23,59,59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    console.log(`📡 Solicitando historial: ${patente}`);

    // Enviamos la PATENTE, ya que en la función configuramos tipoID='patente'
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    console.log("📡 HISTORIAL RECIBIDO:", json);

    let totalDistance = 0;
    let routePoints = [];

    // --- PARSEO RESPUESTA DATOSHISTORICOS ---
    
    // 1. Distancia
    // A veces viene en 'resumen.distancia', a veces en 'totales.distancia'
    if (json.resumen && json.resumen.distancia) totalDistance = parseFloat(json.resumen.distancia);
    else if (json.totales && json.totales.distancia) totalDistance = parseFloat(json.totales.distancia);

    // 2. Puntos (Coordenadas)
    // Puede venir en 'datos', 'filas', 'puntos'
    const dataPoints = json.datos || json.filas || json.puntos || [];
    
    if (Array.isArray(dataPoints) && dataPoints.length > 0) {
      // Si no hay resumen, intentamos sacar la distancia del último punto
      if (totalDistance === 0) {
         const last = dataPoints[dataPoints.length-1];
         // Buscar campos comunes de distancia acumulada
         if (last.distancia_acumulada) totalDistance = parseFloat(last.distancia_acumulada);
         else if (last.distancia) totalDistance = parseFloat(last.distancia);
      }

      // Extraer Lat/Lon
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

// 3. Obtener distancia SIMPLE (Para la tabla de comparación)
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    // Reutilizamos la lógica del historial completo pero devolvemos solo el número
    const data = await fetchGpsHistory(assetId, dateFrom, dateTo);
    return data.totalDistance;
};

// 4. Algoritmo de Mapeo (Con tu lógica de negocio)
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

  Object.keys(csvSummary).forEach(unidadCsv => {
    const csvInfo = csvSummary[unidadCsv];
    
    // Normalizar
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv); // Ej: "25"

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate); // Viene de 'patente'
      const gpsName = clean(asset.name);   // Viene de 'alias' (ej: "MOVIL25...")

      // 1. Coincidencia Patente
      if (gpsPlaca.length > 2 && csvPlaca.length > 2 && gpsPlaca === csvPlaca) return true;
      
      // 2. Coincidencia por Nombre (contiene la unidad)
      // Ej: GPS "MOVIL25" contiene CSV "25"
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
      gpsSearchKey: gpsAsset ? gpsAsset.plate : null, // Usamos la patente para buscar historial
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};