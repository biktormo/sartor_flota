// src/utils/gpsService.js

export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    // Dejamos el log para ver la victoria
    console.log("📡 DATOS DE FLOTA (GETLASTDATA):", json);

    let rawAssets = [];

    // Estrategia de búsqueda de datos
    // 1. A veces viene en json.d
    if (json.d) rawAssets = json.d;
    // 2. A veces viene en json.data
    else if (json.data) rawAssets = json.data;
    // 3. A veces es el objeto raíz
    else rawAssets = json;

    // Si es un objeto (ej: { "101": {data}, "102": {data} }), lo convertimos a array
    if (!Array.isArray(rawAssets) && typeof rawAssets === 'object') {
        rawAssets = Object.values(rawAssets).filter(item => typeof item === 'object');
    }

    return rawAssets.map(asset => ({
      // Mapeo de campos típicos de StreetZ/Cybermapa
      id: asset.uID || asset.id || asset.unitID,
      // 'n' suele ser el nombre corto, 'dsc' la descripción
      name: asset.n || asset.dsc || asset.name || asset.alias || 'Sin Nombre',
      // A veces la patente no viene explícita, usamos el nombre como fallback
      plate: asset.p || asset.plate || asset.n || '' 
    }));

  } catch (error) {
    console.error("Error procesando flota GPS:", error);
    return [];
  }
};

// ... (fetchGpsDistance y matchFleetData se mantienen igual) ...

export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
  try {
    const format = (d) => d.toISOString().replace('T', ' ').substring(0, 19);
    const fromStr = format(dateFrom);
    const toStr = format(dateTo);
    
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    // Ajustar según respuesta real de GETHISTORY
    if (json.resumen && json.resumen.distancia) return parseFloat(json.resumen.distancia);
    
    return 0; 
  } catch (error) {
    console.error(`Error distancia GPS:`, error);
    return 0;
  }
};

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
    
    const gpsAsset = gpsAssets.find(asset => {
      const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const p1 = clean(asset.plate);
      const p2 = clean(csvInfo.placa);
      const n1 = clean(asset.name);
      const n2 = clean(unidadCsv);

      if (p1 && p2 && p1 === p2) return true;
      if (n2.length > 1 && n1.includes(n2)) return true;
      
      return false;
    });

    matchedData.push({
      unidad: unidadCsv,
      placa: csvInfo.placa,
      litrosCsv: csvInfo.litros,
      costoCsv: csvInfo.costo,
      gpsId: gpsAsset ? (gpsAsset.id || gpsAsset.plate) : null,
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};