export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    
    if (!response.ok) {
        const txt = await response.text();
        console.error("Error API:", txt);
        return [];
    }

    const json = await response.json();
    console.log("📡 API GETVEHICULOS:", json);

    // Según la doc, devuelve un Array directo [ {...}, {...} ]
    let rawAssets = [];
    if (Array.isArray(json)) {
        rawAssets = json;
    } else if (json.datos) { // Por si acaso viene envuelto
        rawAssets = json.datos;
    }

    return rawAssets.map(asset => ({
      // Mapeo exacto según tu captura de pantalla de la documentación
      id: asset.id_gps || asset.patente, 
      name: asset.alias || asset.descripcion || asset.patente,
      plate: asset.patente || ''
    }));

  } catch (error) {
    console.error("Error interno GPS:", error);
    return [];
  }
};

export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
  try {
    // Formato exacto de la doc: "yyyy-mm-dd hh:mm:ss"
    const format = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromStr = format(dateFrom);
    const toStr = format(dateTo);
    
    // Aquí pasamos la PATENTE porque la función netlify usa bodyPayload.vehiculo
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    // La doc dice que paginan los resultados. 
    // Buscamos un resumen o sumamos los puntos si es necesario.
    // Usualmente traen un campo 'distancia_total' o similar en la raíz o primer registro.
    if (json.resumen && json.resumen.distancia) return parseFloat(json.resumen.distancia);
    
    // Si devuelve array de posiciones, sumamos distancias parciales (simplificado)
    if (Array.isArray(json) && json.length > 0) {
        // A veces el último registro tiene el acumulado
        const last = json[json.length-1];
        if (last.distancia) return parseFloat(last.distancia);
    }

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
    
    // Normalizar
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv);

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate);
      const gpsName = clean(asset.name);

      // Coincidencia Patente (Prioridad)
      if (gpsPlaca.length > 2 && csvPlaca.length > 2 && gpsPlaca === csvPlaca) return true;
      
      // Coincidencia Nombre contiene Unidad (Ej: "Movil 25" contiene "25")
      if (csvUnidad.length > 0 && gpsName.includes(csvUnidad)) return true;
      
      return false;
    });

    matchedData.push({
      unidad: unidadCsv,
      placa: csvInfo.placa,
      litrosCsv: csvInfo.litros,
      costoCsv: csvInfo.costo,
      // Para el historial usamos la patente si existe, sino el ID
      gpsId: gpsAsset ? (gpsAsset.plate || gpsAsset.id) : null,
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};