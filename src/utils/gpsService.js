// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    console.log("📡 API GETVEHICULOS (RAW):", json);

    let rawAssets = [];

    // --- CORRECCIÓN DE ESTRUCTURA ---
    // 1. Caso Actual (Tu captura): La respuesta ES el array directamente
    if (Array.isArray(json)) {
        rawAssets = json;
    }
    // 2. Caso Alternativo: Viene dentro de 'unidades'
    else if (json.unidades && Array.isArray(json.unidades)) {
        rawAssets = json.unidades;
    }
    // 3. Caso Alternativo: Viene dentro de 'datos'
    else if (json.datos && Array.isArray(json.datos)) {
        rawAssets = json.datos;
    }

    if (rawAssets.length === 0) {
        console.warn("⚠️ Lista vacía o formato desconocido.");
        return [];
    }

    return rawAssets.map(asset => ({
      // MAPEO SEGÚN TU CAPTURA DE PANTALLA:
      // El ID único viene en la propiedad 'gps'
      id: asset.gps || asset.id,         
      // El nombre visual viene en 'alias' o 'nombre'
      name: asset.alias || asset.nombre || 'Sin Nombre', 
      // La patente viene en 'patente'
      plate: asset.patente || ''   
    }));

  } catch (error) {
    console.error("Error GPS Assets:", error);
    return [];
  }
};

// 2. Obtener Historial Completo
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
    
    console.log(`📡 Solicitando historial: ${patente}`);

    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    let totalDistance = 0;
    let routePoints = [];
    
    // Distancia
    if (json.resumen && json.resumen.distancia) {
      totalDistance = parseFloat(json.resumen.distancia);
    } else if (json.totales && json.totales.distancia) {
      totalDistance = parseFloat(json.totales.distancia);
    }

    // Puntos
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

// 3. Obtener Distancia Simple
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    const data = await fetchGpsHistory(assetId, dateFrom, dateTo);
    return data.totalDistance;
};

// 4. Algoritmo de Mapeo (Vinculación)
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
    
    // Normalizar datos para comparar
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv); // Ej: "25"

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate);
      const gpsName = clean(asset.name); // Ej: "MOVIL 25..."

      // 1. Coincidencia por Patente (Prioridad)
      if (gpsPlaca.length > 2 && csvPlaca.length > 2 && gpsPlaca === csvPlaca) return true;
      
      // 2. Coincidencia por Nombre (Si el nombre contiene el número de unidad)
      // Buscamos si "25" está dentro de "MOVIL 25"
      if (csvUnidad.length > 0 && gpsName.includes(csvUnidad)) {
          // Verificación extra para no confundir unidad "2" con "25"
          // Buscamos bordes de palabra o el número tal cual
          if (gpsName === csvUnidad || gpsName.includes(` ${csvUnidad}`) || gpsName.includes(`${csvUnidad} `)) {
              return true;
          }
          // Si el CSV es "25" y GPS es "MOVIL 25", un includes simple suele bastar
          return true;
      }
      
      return false;
    });

    matchedData.push({
      unidad: unidadCsv,
      placa: csvInfo.placa,
      litrosCsv: csvInfo.litros,
      costoCsv: csvInfo.costo,
      // Usamos el ID ('gps') para vincular, y la Patente para buscar historial
      gpsId: gpsAsset ? gpsAsset.id : null, 
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsSearchKey: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};