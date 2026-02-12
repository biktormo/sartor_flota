// src/utils/gpsService.js

// --- TU CÓDIGO BASE QUE FUNCIONA ---
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    console.log("📡 API GETVEHICULOS:", json);

    // Lectura correcta de la propiedad 'unidades'
    const rawAssets = json.unidades || [];

    if (!Array.isArray(rawAssets) || rawAssets.length === 0) {
        console.warn("⚠️ No se encontraron vehículos en la propiedad 'unidades'.");
        return [];
    }

    return rawAssets.map(asset => ({
      id: asset.id_gps,   // ID numérico
      name: asset.alias,  // Nombre visual
      plate: asset.patente // Patente para búsquedas
    }));

  } catch (error) {
    console.error("Error procesando flota GPS:", error);
    return [];
  }
};

// --- NUEVA FUNCIONALIDAD: HISTORIAL ---

export const fetchGpsHistory = async (patente, dateFrom, dateTo) => {
  try {
    // Formateador de fecha exacto para la API: "YYYY-MM-DD HH:MM:SS"
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    // Aseguramos cubrir el día completo (00:00 a 23:59)
    const fromDate = new Date(dateFrom); fromDate.setHours(0, 0, 0);
    const toDate = new Date(dateTo); toDate.setHours(23, 59, 59);

    const fromStr = format(fromDate);
    const toStr = format(toDate);
    
    console.log(`📡 Pidiendo Historial para Patente: ${patente}`);

    // Llamamos a tu backend que usa DATOSHISTORICOS con tipoID='patente'
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
    
    if (!response.ok) throw new Error("Error en la petición al servidor");

    const json = await response.json();
    console.log("📡 HISTORIAL RAW:", json);

    let totalDistance = 0;
    let routePoints = [];

    // --- PARSEO DE RESPUESTA HISTÓRICA ---
    // La API suele devolver la lista en 'result', 'datos' o 'filas'
    const dataPoints = json.result || json.datos || json.filas || (Array.isArray(json) ? json : []);
    
    if (dataPoints.length > 0) {
      // 1. Calcular Distancia
      // A veces viene un resumen, sino tomamos el acumulado del último punto
      if (json.resumen && json.resumen.distancia) {
          totalDistance = parseFloat(json.resumen.distancia);
      } else {
          const last = dataPoints[dataPoints.length - 1];
          // Buscamos campos comunes de distancia acumulada
          if (last.distancia_acumulada) totalDistance = parseFloat(last.distancia_acumulada);
          else if (last.distancia) totalDistance = parseFloat(last.distancia);
          else if (last.odometro) {
              // Si solo hay odómetro, restamos el último menos el primero
              const first = dataPoints[0];
              totalDistance = parseFloat(last.odometro) - parseFloat(first.odometro);
          }
      }

      // 2. Extraer Coordenadas para el Mapa
      routePoints = dataPoints
        .filter(p => (p.lat && p.lon) || (p.y && p.x))
        .map(p => {
            const lat = parseFloat(p.lat || p.y);
            const lng = parseFloat(p.lon || p.x);
            return [lat, lng];
        });
    }

    return {
      totalDistance: Math.max(0, totalDistance), // Evitar negativos
      routePoints,
      heatPoints: routePoints.map(p => [p[0], p[1], 1]), // Formato para mapa de calor
    };

  } catch (error) {
    console.error(`Error obteniendo historial:`, error);
    return { totalDistance: 0, routePoints: [], heatPoints: [] };
  }
};

// --- ALGORITMO DE VINCULACIÓN (Usando tu base) ---
export const matchFleetData = (csvData, gpsAssets) => {
  const matchedData = [];
  const csvSummary = {};

  // Agrupar CSV
  csvData.forEach(row => {
    if (!csvSummary[row.unidad]) {
      csvSummary[row.unidad] = { litros: 0, costo: 0, placa: row.placa };
    }
    csvSummary[row.unidad].litros += row.litros;
    csvSummary[row.unidad].costo += row.costo;
  });

  // Cruzar
  Object.keys(csvSummary).forEach(unidadCsv => {
    const csvInfo = csvSummary[unidadCsv];
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv);

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate);
      const gpsName = clean(asset.name);

      // Coincidencia Patente
      if (gpsPlaca.length > 2 && csvPlaca.length > 2 && gpsPlaca === csvPlaca) return true;
      // Coincidencia Nombre (alias) contiene unidad CSV
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
      // IMPORTANTE: Guardamos la patente vinculada para pedir el historial después
      linkedPlate: gpsAsset ? gpsAsset.plate : null, 
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: new Date(), max: new Date() } }; // (Rangos simplificados)
};