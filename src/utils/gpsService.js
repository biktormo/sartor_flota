export const fetchGpsAssets = async () => {
    try {
      const response = await fetch('/api/cybermapa?endpoint=assets');
      const json = await response.json();
      
      console.log("📡 API GETVEHICULOS:", json);
  
      // La documentación no especifica la estructura exacta de la respuesta JSON,
      // pero suele ser un array directo o una propiedad 'datos' / 'filas'.
      // Buscamos un array en las propiedades comunes.
      let rawAssets = [];
      
      if (Array.isArray(json)) {
          rawAssets = json;
      } else if (json.datos && Array.isArray(json.datos)) {
          rawAssets = json.datos;
      } else if (json.result && Array.isArray(json.result)) {
          rawAssets = json.result;
      }
  
      return rawAssets.map(asset => ({
        // Mapeo flexible según lo que devuelva GETVEHICULOS
        // La doc no especifica nombres de columna de salida, asumimos estándar
        id: asset.id || asset.vehiculo || asset.patente, 
        name: asset.alias || asset.nombre || asset.vehiculo || asset.patente || 'Sin Nombre',
        plate: asset.patente || asset.placa || asset.vehiculo || ''
      }));
  
    } catch (error) {
      console.error("Error obteniendo vehículos GPS:", error);
      return [];
    }
  };
  
  export const fetchGpsDistance = async (patente, dateFrom, dateTo) => {
    try {
      // Formato requerido: "yyyy-mm-dd hh:mm:ss"
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
      
      const response = await fetch(`/api/cybermapa?endpoint=history&patente=${patente}&from=${fromStr}&to=${toStr}`);
      const json = await response.json();
      
      // DATOSHISTORICOS suele devolver un array de puntos o un resumen.
      // Si la API es inteligente, buscamos un total. Si no, calculamos.
      
      // Caso 1: Viene un resumen
      if (json.resumen && json.resumen.distancia) return parseFloat(json.resumen.distancia);
      
      // Caso 2: Viene un array de puntos 'datos'
      // (Esta es una simplificación, idealmente la API debería dar el total)
      if (json.datos && Array.isArray(json.datos)) {
          // A veces el último punto tiene la distancia acumulada del reporte
          const last = json.datos[json.datos.length - 1];
          if (last && last.distancia_acumulada) return parseFloat(last.distancia_acumulada);
          // O sumamos tramos (complejo)
      }
      
      return 0; 
    } catch (error) {
      console.error(`Error GPS Distance ${patente}:`, error);
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
      
      // Lógica de coincidencia mejorada
      const gpsAsset = gpsAssets.find(asset => {
        const p1 = (asset.plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const p2 = (csvInfo.placa || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        // Coincidencia Patente
        if (p1 && p2 && p1 === p2) return true;
        // Coincidencia Nombre contiene Unidad
        if (asset.name && asset.name.includes(unidadCsv)) return true;
        
        return false;
      });
  
      matchedData.push({
        unidad: unidadCsv,
        placa: csvInfo.placa,
        litrosCsv: csvInfo.litros,
        costoCsv: csvInfo.costo,
        gpsId: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null, // Usamos patente para el ID si es posible
        gpsName: gpsAsset ? gpsAsset.name : null,
        gpsDistance: 0,
        rendimientoReal: 0
      });
    });
  
    return { matchedData, dateRange: { min: minDate, max: maxDate } };
  };