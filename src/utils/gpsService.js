// src/utils/gpsService.js

// 1. Obtener lista de vehículos (Restaurado a lo que funcionaba)
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    
    if (!response.ok) throw new Error(`Error red: ${response.status}`);

    const json = await response.json();
    console.log("📡 LISTA VEHÍCULOS (RAW):", json);

    // Buscamos la propiedad que devolvió INITIALIZE en tu captura
    // La función Netlify la empaqueta en 'unidades' o viene directo si devolvió 'loginPositions'
    const rawAssets = json.unidades || json.loginPositions || [];

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía. Revisa la consola.");
    }

    return rawAssets.map(asset => ({
      // MAPEO EXACTO BASADO EN TU CAPTURA DE PANTALLA:
      id: asset.gps,         // El ID numérico es 'gps' (ej: "86528...")
      name: asset.alias,     // El nombre visual es 'alias' (ej: "MOVIL 25...")
      plate: asset.patente   // La patente es 'patente' (ej: "AA472RQ")
    }));

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener Historial (Usando la API Documentada)
export const fetchGpsHistory = async (assetId, dateFrom, dateTo) => {
  try {
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    // Rango completo
    const fromDate = new Date(dateFrom); fromDate.setHours(0,0,0);
    const toDate = new Date(dateTo); toDate.setHours(23,59,59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    console.log(`📡 Pidiendo Historial ID: ${assetId}`);

    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    console.log("📡 HISTORIAL RECIBIDO:", json);

    let totalDistance = 0;
    let routePoints = [];

    // --- PARSEO DATOSHISTORICOS ---
    // Según doc, puede venir paginado o con resumen
    
    // 1. Distancia Total
    if (json.resumen && json.resumen.distancia) {
      totalDistance = parseFloat(json.resumen.distancia);
    } 
    else if (json.totales && json.totales.distancia) {
      totalDistance = parseFloat(json.totales.distancia);
    }

    // 2. Puntos del mapa
    // La doc dice que devuelve una lista. Buscamos 'datos', 'filas' o 'result'
    const dataPoints = json.datos || json.filas || json.result || [];
    
    if (Array.isArray(dataPoints) && dataPoints.length > 0) {
      // Si no hubo resumen, intentamos sumar o tomar el acumulado del último punto
      if (totalDistance === 0) {
         const last = dataPoints[dataPoints.length-1];
         // Buscamos campos comunes de distancia acumulada
         if (last.distancia_acumulada) totalDistance = parseFloat(last.distancia_acumulada);
         else if (last.distancia) totalDistance = parseFloat(last.distancia);
      }

      // Mapear Latitud/Longitud
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

// 3. Match Fleet Data (Sin cambios, usa lo anterior)
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
      gpsId: gpsAsset ? asset.id : null, // ID numérico
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsSearchKey: gpsAsset ? asset.id : null, // Usamos ID numérico para buscar
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};

// 4. Distancia simple (Reutiliza el historial)
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    const data = await fetchGpsHistory(assetId, dateFrom, dateTo);
    return data.totalDistance;
};