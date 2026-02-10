// src/utils/gpsService.js

export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    // --- ESTO ES LO QUE NECESITO VER ---
    console.log("🔍 ESTRUCTURA COMPLETA:", JSON.stringify(json, null, 2)); 
    // ----------------------------------

    // Intentos desesperados de encontrar los datos
    // A veces están en 'configuracionDinamica' o 'clientConfig'
    let rawAssets = 
        json.units || 
        json.data?.units || 
        json.configuracionDinamica?.units ||
        json.clientConfig?.units ||
        [];

    // Si encontramos un objeto en lugar de array, lo convertimos
    if (!Array.isArray(rawAssets) && typeof rawAssets === 'object') {
        rawAssets = Object.values(rawAssets);
    }

    return rawAssets.map(asset => ({
      id: asset.id || asset.uID,
      name: asset.dsc || asset.n,
      plate: asset.plate || asset.p || ''
    }));

  } catch (error) {
    console.error("Error GPS:", error);
    return [];
  }
};
  
  export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    try {
      const format = (d) => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
      };
      
      const fromStr = format(dateFrom);
      const toStr = format(dateTo);
      
      // Usamos la misma ruta /api/
      const url = `/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`;
      
      const response = await fetch(url);
      if (!response.ok) return 0;
  
      const json = await response.json();
      
      if (json.resumen && json.resumen.distancia) {
          return parseFloat(json.resumen.distancia);
      }
      return 0; 
    } catch (error) {
      console.error(`Error distancia GPS (${assetId}):`, error);
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
      
      // Normalización fuerte para comparar
      const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const csvPlaca = clean(csvInfo.placa);
      const csvUnidad = clean(unidadCsv);
  
      const gpsAsset = gpsAssets.find(asset => {
        const gpsPlaca = clean(asset.plate);
        const gpsName = clean(asset.name);
  
        // 1. Patente exacta
        if (gpsPlaca && csvPlaca && gpsPlaca === csvPlaca) return true;
        // 2. Nombre contiene unidad (Ej: "Movil25" contiene "25")
        if (csvUnidad.length > 1 && gpsName.includes(csvUnidad)) return true;
        
        return false;
      });
  
      matchedData.push({
        unidad: unidadCsv,
        placa: csvInfo.placa,
        litrosCsv: csvInfo.litros,
        costoCsv: csvInfo.costo,
        gpsId: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null,
        gpsName: gpsAsset ? gpsAsset.name : null,
        gpsDistance: 0,
        rendimientoReal: 0
      });
    });
  
    return { matchedData, dateRange: { min: minDate, max: maxDate } };
  };