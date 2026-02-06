// src/utils/gpsService.js

// 1. Obtener lista de vehículos de Cybermapa
export const fetchGpsAssets = async () => {
    try {
      // Llamamos a nuestra función de Netlify que a su vez llama a la API de Commers
      const response = await fetch('/api/cybermapa?endpoint=assets');
      
      if (!response.ok) {
          // Si el servidor de Netlify o la API falla, captura el error
          const errorText = await response.text();
          throw new Error(`Error de red: ${response.status} - ${errorText}`);
      }
  
      const json = await response.json();
      
      // --- LÓGICA DE PARSEO DE RESPUESTA 'INITIALIZE' ---
      // La respuesta de INITIALIZE suele ser compleja. La lista de vehículos
      // podría estar en 'units', 'devices', 'data.units', etc.
      // Si esto falla, aquí es donde debemos ver la pestaña "Response" de la consola.
      const rawAssets = json.units || json.devices || (json.data && json.data.units) || [];
  
      // Si sigue sin encontrar nada, lanzamos un error claro
      if (!Array.isArray(rawAssets)) {
          console.error("Respuesta inesperada de la API:", json);
          throw new Error("El formato de la lista de vehículos no es el esperado.");
      }
      
      // Normalizamos los datos para que nuestra app los entienda
      return rawAssets.map(asset => ({
        id: asset.id || asset.id_unit,      // El ID único del vehículo en el GPS
        name: asset.dsc || asset.name,      // El nombre o "alias" (ej: "Móvil 25")
        plate: asset.plate || asset.id      // La patente
      }));
  
    } catch (error) {
      console.error("Error obteniendo vehículos GPS:", error);
      // Devolvemos un array vacío en caso de error para no romper la app
      return [];
    }
  };
  
  // 2. Obtener distancia recorrida en un rango de fechas
  export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
    try {
      // Formatear fechas a YYYY-MM-DD HH:MM:SS, que es lo que suelen pedir estas APIs
      const format = (d) => d.toISOString().replace('T', ' ').substring(0, 19);
      
      const fromStr = format(dateFrom);
      const toStr = format(dateTo);
      
      // Usamos 'patente' como parámetro porque así lo definimos en la función Netlify,
      // aunque en realidad le pasemos el 'assetId'.
      const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
      const json = await response.json();
      
      // La respuesta de historial suele tener un resumen.
      // Buscamos un campo como 'distancia' o 'total_km'.
      // Esto es una suposición y debe ajustarse a la respuesta real.
      if (json.resumen && json.resumen.distancia) {
          return parseFloat(json.resumen.distancia);
      }
      
      // Si no hay resumen, podríamos tener que sumar las distancias de cada punto del historial
      // (Lógica más compleja, por ahora devolvemos 0 si no hay resumen)
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
    let minDate = new Date();
    let maxDate = new Date(0);
  
    // Agrupar datos del CSV por unidad
    csvData.forEach(row => {
      if (!csvSummary[row.unidad]) {
        csvSummary[row.unidad] = { litros: 0, costo: 0, placa: row.placa };
      }
      csvSummary[row.unidad].litros += row.litros;
      csvSummary[row.unidad].costo += row.costo;
  
      // Detectar el rango de fechas total del CSV
      const rowDate = row.timestamp ? new Date(row.timestamp) : new Date();
      if (rowDate < minDate) minDate = rowDate;
      if (rowDate > maxDate) maxDate = rowDate;
    });
  
    // Iterar sobre las unidades del CSV y buscar su par en el GPS
    Object.keys(csvSummary).forEach(unidadCsv => {
      const csvInfo = csvSummary[unidadCsv];
      
      const gpsAsset = gpsAssets.find(asset => {
        // Normalizar patentes (quitar guiones y espacios)
        const cleanPlateGPS = (asset.plate || '').replace(/[^a-zA-Z0-9]/g, '');
        const cleanPlateCSV = (csvInfo.placa || '').replace(/[^a-zA-Z0-9]/g, '');
        
        // Criterio 1: Coincidencia exacta de patente
        if (cleanPlateGPS && cleanPlateCSV && cleanPlateGPS === cleanPlateCSV) return true;
        
        // Criterio 2: Coincidencia por nombre de unidad (si el alias en GPS es "Móvil 25")
        if (asset.name && asset.name.includes(unidadCsv)) return true;
        
        return false;
      });
  
      matchedData.push({
        unidad: unidadCsv,
        placa: csvInfo.placa,
        litrosCsv: csvInfo.litros,
        costoCsv: csvInfo.costo,
        gpsId: gpsAsset ? gpsAsset.id : null,
        gpsName: gpsAsset ? gpsAsset.name : null,
        gpsDistance: 0, // Se llenará después con las llamadas individuales
        rendimientoReal: 0
      });
    });
  
    return { matchedData, dateRange: { min: minDate, max: maxDate } };
  };