// src/utils/gpsService.js

export const fetchGpsAssets = async () => {
    // Usamos la ruta /api/ que configuramos en netlify.toml
    const url = '/api/cybermapa?endpoint=assets';
    
    console.log("🚀 Intentando conectar a:", url); // <--- Nuevo log para depurar
  
    try {
      const response = await fetch('/api/cybermapa?endpoint=assets');
      
      // Si la redirección falla o la función no existe
      if (response.status === 404) {
        throw new Error("Funciones no encontradas (404). Revisa el archivo netlify.toml");
      }
  
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error de red: ${response.status} - ${errorText}`);
      }
  
      const json = await response.json();
      console.log("📡 GPS ASSETS RECIBIDOS:", json);
  
      // Búsqueda flexible del array de datos
      let rawAssets = [];
      if (Array.isArray(json)) rawAssets = json;
      else if (json.data) rawAssets = json.data;
      else if (json.items) rawAssets = json.items;
      else if (json.result && Array.isArray(json.result)) rawAssets = json.result;
      
      // Si la API devuelve un objeto con claves numéricas (común en algunas versiones)
      else if (typeof json === 'object' && json !== null) {
          rawAssets = Object.values(json).filter(item => typeof item === 'object');
      }
  
      return rawAssets.map(asset => ({
        id: asset.id || asset.uID || asset.vehiculo,
        name: asset.alias || asset.nombre || asset.name || 'Sin Nombre',
        plate: asset.patente || asset.placa || asset.plate || ''
      }));
  
    } catch (error) {
      console.error("❌ Error FATAL obteniendo vehículos GPS:", error);
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