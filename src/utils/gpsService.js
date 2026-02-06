// src/utils/gpsService.js

// 1. Obtener lista de vehículos de Cybermapa
export const fetchGpsAssets = async () => {
    try {
      // Llamamos a nuestra función de Netlify que actúa de puente
      const response = await fetch('/api/cybermapa?endpoint=assets');
      
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error de red: ${response.status} - ${errorText}`);
      }
  
      const json = await response.json();
  
      // --- DEPURACIÓN CRÍTICA ---
      // Esto imprimirá el objeto completo en la consola del navegador (F12)
      console.log("📡 RESPUESTA CRUDA API (INITIALIZE):", json);
      // --------------------------
  
      // Intentamos encontrar el array de vehículos en las ubicaciones más comunes de esta plataforma
      // La estructura suele ser json.data.units o json.data.view.units
      const rawAssets = 
          json.data?.units || 
          json.data?.view?.units || 
          json.units || 
          json.devices || 
          [];
  
      if (!Array.isArray(rawAssets) || rawAssets.length === 0) {
          console.warn("⚠️ No se encontró el array de vehículos automáticamente. Revisa el objeto impreso arriba.");
          return [];
      }
      
      // Normalizamos los datos para que nuestra app los entienda
      return rawAssets.map(asset => ({
        // Buscamos el ID en varias propiedades posibles
        id: asset.id || asset.uId || asset.unitId || asset.nId,
        // Buscamos el nombre
        name: asset.dsc || asset.name || asset.alias || asset.sName,
        // Buscamos la patente (domain, plate, etc)
        plate: asset.plate || asset.domain || asset.patente || ''
      }));
  
    } catch (error) {
      console.error("Error obteniendo vehículos GPS:", error);
      return [];
    }
  };
  
  // 2. Obtener distancia recorrida en un rango de fechas
  export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    try {
      // Formatear fechas a YYYY-MM-DD HH:MM:SS
      const format = (d) => d.toISOString().replace('T', ' ').substring(0, 19);
      
      const fromStr = format(dateFrom);
      const toStr = format(dateTo);
      
      const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
      const json = await response.json();
      
      // Aquí también podrías descomentar esto si necesitas depurar el historial específico
      // console.log(`Historial ID ${assetId}:`, json);
  
      // Buscamos la distancia en el resumen (estructura común)
      if (json.resumen && json.resumen.distancia) {
          return parseFloat(json.resumen.distancia);
      }
      
      // Si no hay resumen directo, devolvemos 0 por ahora
      return 0; 
  
    } catch (error) {
      console.error(`Error obteniendo distancia para ID ${assetId}:`, error);
      return 0;
    }
  };
  
  // 3. Algoritmo de Mapeo (Cruzar CSV con GPS)
  export const matchFleetData = (csvData, gpsAssets) => {
    const matchedData = [];
    const csvSummary = {};
  
    // Detectar rango de fechas global del CSV para pedir historial
    let minDate = new Date();
    let maxDate = new Date(0);
  
    // Agrupar datos del CSV
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
  
    // Cruzar datos CSV con la lista de GPS obtenida
    Object.keys(csvSummary).forEach(unidadCsv => {
      const csvInfo = csvSummary[unidadCsv];
      
      const gpsAsset = gpsAssets.find(asset => {
        // Función para limpiar strings y comparar mejor
        const clean = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
        const p1 = clean(asset.plate);
        const p2 = clean(csvInfo.placa);
        const n1 = clean(asset.name);
        const n2 = clean(unidadCsv);
  
        // 1. Coincidencia por Patente (la más segura)
        if (p1 && p2 && p1 === p2) return true;
        
        // 2. Coincidencia por Nombre (ej: GPS:"Movil 25" contiene CSV:"25")
        if (n1 && n2 && n1.includes(n2)) return true;
        
        return false;
      });
  
      matchedData.push({
        unidad: unidadCsv,
        placa: csvInfo.placa,
        litrosCsv: csvInfo.litros,
        costoCsv: csvInfo.costo,
        gpsId: gpsAsset ? gpsAsset.id : null,
        gpsName: gpsAsset ? gpsAsset.name : null,
        gpsDistance: 0, // Se llenará asíncronamente después
        rendimientoReal: 0
      });
    });
  
    return { matchedData, dateRange: { min: minDate, max: maxDate } };
  };