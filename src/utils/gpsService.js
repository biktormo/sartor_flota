// src/utils/gpsService.js

export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error de red: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    console.log("📡 RESPUESTA API:", json);

    // Búsqueda profunda de un array
    let rawAssets = [];
    
    // Caso A: Array directo
    if (Array.isArray(json)) rawAssets = json;
    // Caso B: Propiedades comunes
    else if (json.data && Array.isArray(json.data)) rawAssets = json.data;
    else if (json.items) rawAssets = json.items;
    else if (json.rows) rawAssets = json.rows;
    // Caso C: Objeto indexado (común en Commers) -> { "101": {id...}, "102": {id...} }
    else if (typeof json === 'object') {
        // Buscamos valores que parezcan vehículos (tengan 'n' o 'name' o 'id')
        rawAssets = Object.values(json).filter(item => item && (item.n || item.name || item.dsc || item.uID));
    }

    return rawAssets.map(asset => ({
      // Mapeo de campos raros típicos de .jss
      id: asset.uID || asset.id || asset.unitId,
      name: asset.n || asset.name || asset.dsc || asset.alias || 'Sin Nombre',
      // A veces la patente no viene, usamos el nombre como fallback
      plate: asset.p || asset.plate || asset.n || '' 
    }));

  } catch (error) {
    console.error("Error obteniendo vehículos GPS:", error);
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