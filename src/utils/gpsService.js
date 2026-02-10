// src/utils/gpsService.js

// 1. Obtener lista de vehículos
export const fetchGpsAssets = async () => {
  try {
    const response = await fetch('/api/cybermapa?endpoint=assets');
    const json = await response.json();
    
    console.log("📡 DATOS RECIBIDOS (GPS):", json);

    // --- CAMBIO CLAVE: Leer 'loginPositions' ---
    // En la arquitectura 'main.jss', esta es la lista que viene con el login.
    const rawAssets = json.loginPositions || [];

    if (rawAssets.length === 0) {
        console.warn("⚠️ La lista 'loginPositions' está vacía o no existe.");
    }

    return rawAssets.map(asset => {
      // Mapeo de campos "minificados" típicos de StreetZ/Commers
      // uID: ID único
      // n: Nombre (Name)
      // p: Patente (Plate) - A veces no viene y hay que usar el nombre
      return {
        id: asset.uID || asset.id,
        name: asset.n || asset.name || asset.alias || 'Desconocido',
        plate: asset.p || asset.plate || asset.n || '' // Si no hay patente, usamos el nombre como fallback
      };
    });

  } catch (error) {
    console.error("Error obteniendo vehículos GPS:", error);
    return [];
  }
};

// 2. Obtener distancia (Se mantiene igual, confiando en el 'Doble Salto' del backend)
export const fetchGpsDistance = async (assetId, dateFrom, dateTo) => {
  try {
    // Formato fecha: YYYY-MM-DD HH:MM:SS
    const format = (d) => {
        // Ajuste de zona horaria simple (local a string)
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    
    const fromStr = format(dateFrom);
    const toStr = format(dateTo);
    
    const response = await fetch(`/api/cybermapa?endpoint=history&patente=${assetId}&from=${fromStr}&to=${toStr}`);
    const json = await response.json();
    
    // Buscar distancia en resumen
    if (json.resumen && json.resumen.distancia) {
        return parseFloat(json.resumen.distancia);
    }
    return 0; 
  } catch (error) {
    console.error(`Error distancia GPS:`, error);
    return 0;
  }
};

// 3. Algoritmo de Mapeo "Super Flexible"
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
    
    // Normalizar para comparar (quitar espacios, guiones, mayúsculas)
    const clean = (s) => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    const csvPlaca = clean(csvInfo.placa);
    const csvUnidad = clean(unidadCsv); // Ej: "25"

    const gpsAsset = gpsAssets.find(asset => {
      const gpsPlaca = clean(asset.plate);
      const gpsName = clean(asset.name); // Ej: "MOVIL25" o "KWZ969"

      // ESTRATEGIA 1: Patente exacta (La mejor)
      // (Solo si la patente tiene al menos 3 caracteres para evitar falsos positivos con "1", "2")
      if (csvPlaca.length > 2 && gpsPlaca.length > 2) {
          if (gpsPlaca.includes(csvPlaca) || csvPlaca.includes(gpsPlaca)) return true;
      }

      // ESTRATEGIA 2: Nombre contiene Patente
      if (csvPlaca.length > 2 && gpsName.includes(csvPlaca)) return true;

      // ESTRATEGIA 3: Nombre contiene Número de Unidad
      // Ej: CSV="25" y GPS="MOVIL 25" -> Match
      // Pero cuidado: CSV="1" no debería matchear GPS="MOVIL 10"
      if (csvUnidad.length > 0) {
          // Buscamos el número exacto rodeado de bordes o texto
          if (gpsName === csvUnidad) return true;
          if (gpsName.endsWith(csvUnidad)) return true; // "MOVIL25" termina en "25"
          if (gpsName.includes(` ${csvUnidad} `)) return true; // "MOVIL 25 SCANIA"
      }
      
      return false;
    });

    matchedData.push({
      unidad: unidadCsv,
      placa: csvInfo.placa,
      litrosCsv: csvInfo.litros,
      costoCsv: csvInfo.costo,
      gpsId: gpsAsset ? gpsAsset.id : null,
      gpsName: gpsAsset ? gpsAsset.name : null,
      gpsDistance: 0,
      rendimientoReal: 0
    });
  });

  return { matchedData, dateRange: { min: minDate, max: maxDate } };
};