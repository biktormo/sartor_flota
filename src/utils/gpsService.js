// src/utils/gpsService.js

// Función para calcular distancia entre dos coordenadas (Haversine)
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la tierra en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

// 1. Obtener lista (Mantiene la lógica que ya funcionó con loginPositions)
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    console.log("📡 API GETVEHICULOS:", json);

    // Buscamos 'unidades' (que devolvimos desde netlify) o 'loginPositions'
    const rawAssets = json.unidades || json.loginPositions || [];

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía.");
        return [];
    }

    return rawAssets.map(asset => ({
      // TU CAPTURA DE PANTALLA MOSTRABA ESTOS CAMPOS EN loginPositions:
      id: asset.gps,         // "86528..."
      name: asset.alias,     // "MOVIL 25..."
      plate: asset.patente   // "AA472RQ"
    }));

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener Historial (ADAPTADO A DOCUMENTACIÓN)
export const fetchGpsHistory = async (assetId, dateFrom, dateTo) => {
  try {
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
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

    // --- PARSEO SEGÚN DOCUMENTACIÓN ---
    // La documentación dice que el array se llama "posiciones"
    const dataPoints = json.posiciones || json.datos || [];
    
    if (Array.isArray(dataPoints) && dataPoints.length > 0) {
      
      // Mapear Latitud/Longitud
      routePoints = dataPoints
        .filter(p => (p.latitud && p.longitud) || (p.lat && p.lon))
        .map(p => {
            const lat = parseFloat(p.latitud || p.lat);
            const lng = parseFloat(p.longitud || p.lon);
            return [lat, lng];
        });

      // Calcular distancia total sumando punto a punto
      for (let i = 0; i < routePoints.length - 1; i++) {
          totalDistance += getDistanceFromLatLonInKm(
              routePoints[i][0], routePoints[i][1],
              routePoints[i+1][0], routePoints[i+1][1]
          );
      }
    }

    return {
      totalDistance: Math.round(totalDistance * 10) / 10, // Redondear 1 decimal
      routePoints,
      heatPoints: routePoints.map(p => [p[0], p[1], 1]), 
    };

  } catch (error) {
    console.error(`Error historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// 3. Wrapper Distancia
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    const data = await fetchGpsHistory(assetId, dateFrom, dateTo);
    return data.totalDistance;
};

// 4. Mapeo (Se mantiene igual)
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
      gpsSearchKey: gpsAsset ? asset.id : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};