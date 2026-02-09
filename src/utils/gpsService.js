// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
    try {
      // --- CAMBIO CRÍTICO: Ruta directa a la función ---
      // Usamos '/.netlify/functions/' en lugar de '/api/' para evitar errores de redirección
      const response = await fetch('/.netlify/functions/cybermapa?endpoint=assets');
      
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error de red: ${response.status} - ${errorText}`);
      }
  
      const json = await response.json();
      
      console.log("📡 GPS ASSETS:", json);
  
      // Intentar encontrar el array en distintas estructuras posibles
      let rawAssets = [];
      if (Array.isArray(json)) rawAssets = json;
      else if (json.data) rawAssets = json.data;
      else if (json.items) rawAssets = json.items;
      else if (json.result && Array.isArray(json.result)) rawAssets = json.result;
  
      return rawAssets.map(asset => ({
        id: asset.id || asset.uID || asset.vehiculo,
        name: asset.alias || asset.nombre || asset.name || 'Sin Nombre',
        plate: asset.patente || asset.placa || asset.plate || ''
      }));
  
    } catch (error) {
      console.error("Error obteniendo vehículos GPS:", error);
      return [];
    }
  };
  
  // 2. Obtener distancia
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
      
      // --- CAMBIO CRÍTICO: Ruta directa ---
      const response = await fetch(`/.netlify/functions/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
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
  
  // 3. Algoritmo de Mapeo
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
  
    // Cruzar datos
    Object.keys(csvSummary).forEach(unidadCsv => {
      const csvInfo = csvSummary[unidadCsv];
      
      // Normalizar datos del CSV para comparar
      const csvPlacaClean = (csvInfo.placa || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const csvUnidadClean = unidadCsv.toString().toUpperCase().trim();
  
      const gpsAsset = gpsAssets.find(asset => {
        // Normalizar datos del GPS
        const gpsPlacaClean = (asset.plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const gpsNameClean = (asset.name || '').toUpperCase();
  
        // 1. Coincidencia FUERTE: Patente (si ambos tienen)
        if (csvPlacaClean.length > 3 && gpsPlacaClean.length > 3) {
            if (csvPlacaClean === gpsPlacaClean) return true;
        }
  
        // 2. Coincidencia MEDIA: Nombre contiene Unidad (Ej: "MOVIL 25" contiene "25")
        if (csvUnidadClean.length >= 2) {
            // Buscamos "25" dentro de "MOVIL 25"
            if (gpsNameClean.includes(csvUnidadClean)) return true;
        }
        
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