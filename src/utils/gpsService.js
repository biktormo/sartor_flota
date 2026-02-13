// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    
    if (!response.ok) {
        // Si hay error (ej: 400), intentamos leer el mensaje para mostrarlo en consola
        try {
            const errJson = await response.json();
            console.error("Error API:", errJson);
        } catch(e) {}
        throw new Error(`Error red: ${response.status}`);
    }

    const json = await response.json();
    console.log("📡 API DATOSACTUALES:", json);

    let rawAssets = [];

    // Estrategias de búsqueda para DATOSACTUALES
    if (Array.isArray(json)) rawAssets = json;
    else if (json.datos && Array.isArray(json.datos)) rawAssets = json.datos;
    else if (json.unidades && Array.isArray(json.unidades)) rawAssets = json.unidades;
    else if (json.result && Array.isArray(json.result)) rawAssets = json.result;

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía.");
    }

    return rawAssets.map(asset => ({
      // Mapeo flexible
      id: asset.id_gps || asset.id || asset.vehiculo, 
      name: asset.alias || asset.descripcion || asset.nombre || asset.patente || 'Sin Nombre',
      plate: asset.patente || asset.plate || '' 
    })).filter(a => a.id); // Solo devolvemos los que tienen ID

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Historial (Se mantiene igual)
export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromStr = format(dateFrom);
    const toStr = format(dateTo);
    
    // Importante: Usamos la patente porque así configuramos la función
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    console.log("📡 HISTORIAL:", json);

    let totalDistance = 0;
    let routePoints = [];
    
    // Parseo de Distancia
    if (json.resumen && json.resumen.distancia) totalDistance = parseFloat(json.resumen.distancia);
    else if (json.totales && json.totales.distancia) totalDistance = parseFloat(json.totales.distancia);

    // Parseo de Puntos
    const dataPoints = json.datos || json.filas || json.result || (Array.isArray(json) ? json : []);
    
    if (dataPoints.length > 0) {
      if (totalDistance === 0) {
         const last = dataPoints[dataPoints.length-1];
         if (last.distancia_acumulada) totalDistance = parseFloat(last.distancia_acumulada);
         else if (last.distancia) totalDistance = parseFloat(last.distancia);
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
      totalDistance: Math.max(0, totalDistance),
      routePoints,
      heatPoints: routePoints.map(p => [p[0], p[1], 1]), 
    };

  } catch (error) {
    console.error(`Error historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// 3. Mapeo (Se mantiene igual)
export const matchFleetData = (csvData, gpsAssets) => {
    // ... (Copia la función matchFleetData de la respuesta anterior si no la tienes, es larga pero no cambió)
    // Resumida para no ocupar espacio, pero asegura que esté en tu archivo:
    const matchedData = [];
    const csvSummary = {};
    let minDate = new Date();
    let maxDate = new Date(0);

    csvData.forEach(row => {
        if (!csvSummary[row.unidad]) csvSummary[row.unidad] = { litros: 0, costo: 0, placa: row.placa };
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
            gpsSearchKey: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null, // ID para búsqueda (corregido asset -> gpsAsset si existe)
            gpsDistance: 0,
            rendimientoReal: 0
        });
    });
    return { matchedData, dateRange: { min: minDate, max: maxDate } };
};