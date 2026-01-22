import Papa from 'papaparse';

// --- HELPERS ---

const cleanNumber = (val) => {
  if (!val) return 0;
  let str = val.toString();
  // Formato AR/ES: 1.250,50 -> JS: 1250.50
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const number = parseFloat(str);
  return isNaN(number) ? 0 : number;
};

const normalizeKey = (str) => {
  if (!str) return '';
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
};

const findValue = (row, candidates) => {
  const keys = Object.keys(row);
  const normalizedCandidates = candidates.map(c => normalizeKey(c));
  const foundKey = keys.find(key => normalizedCandidates.includes(normalizeKey(key)));
  return foundKey ? row[foundKey] : null;
};

// --- FUNCIONES EXPORTADAS ---

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const processedData = results.data
          .filter(row => {
            const lts = findValue(row, ['LITROS', 'LITRO', 'CANTIDAD']);
            return lts !== null && lts !== '';
          })
          .map((row, index) => {
            const costoRaw = findValue(row, ['M.N.', 'M.N', 'IMPORTE', 'NETO', 'COSTO']) || '0';
            const litrosRaw = findValue(row, ['LITROS', 'LITRO', 'CANTIDAD']) || '0';
            
            // --- NUEVO: ODOMETROS ---
            const odoAntRaw = findValue(row, ['ODÓMETRO ANTERIOR', 'ODOMETRO ANTERIOR', 'KILOMETRAJE ANTERIOR']) || '0';
            const odoUltRaw = findValue(row, ['ÚLTIMO ODÓMETRO', 'ULTIMO ODOMETRO', 'KILOMETRAJE ACTUAL']) || '0';
            
            const odoAnt = cleanNumber(odoAntRaw);
            const odoUlt = cleanNumber(odoUltRaw);
            
            // Calculamos distancia de este viaje específico
            // Validamos que sea mayor a 0 para evitar errores de tipeo en el CSV (ej: vueltas de reloj o errores de carga manual)
            let distanciaViaje = 0;
            if (odoUlt > odoAnt) {
                distanciaViaje = odoUlt - odoAnt;
            }
            // ------------------------

            const unidadRaw = findValue(row, ['UNIDAD', 'MOVIL', 'VEHICULO']) || 'Desconocido';
            const placaRaw = findValue(row, ['PLACA', 'PATENTE', 'DOMINIO']) || '';
            const marcaRaw = findValue(row, ['MARCA']) || '';
            const modeloRaw = findValue(row, ['MODELO']) || '';
            const conductorRaw = findValue(row, ['CONDUCTOR', 'CHOFER']) || 'Sin Asignar';
            const estacionRaw = findValue(row, ['ESTACION DE SERVICIO', 'ESTACION', 'LUGAR', 'DIRECCION ESTACION']) || 'Externo';
            const direccionRaw = findValue(row, ['DIRECCIÓN ESTACIÓN', 'DIRECCION', 'DOMICILIO', 'CALLE']) || '';
            const ciudadRaw = findValue(row, ['CIUDAD', 'LOCALIDAD', 'POBLACION']) || '';

            return {
              id: index,
              fecha: findValue(row, ['FECHA', 'DATE']) || '',
              unidad: unidadRaw,
              placa: placaRaw,
              marca: marcaRaw,
              modelo: modeloRaw,
              conductor: conductorRaw,
              litros: cleanNumber(litrosRaw),
              costo: cleanNumber(costoRaw),
              estacion: estacionRaw,
              direccion: direccionRaw,
              ciudad: ciudadRaw,
              // Guardamos la distancia calculada
              distancia: distanciaViaje 
            };
          });
        resolve(processedData);
      },
      error: (error) => reject(error),
    });
  });
};

export const calculateKPIs = (data) => {
  if (!data || data.length === 0) {
    return { totalLitros: 0, totalCosto: 0, topConsumers: [] };
  }

  const totalLitros = data.reduce((acc, curr) => acc + (curr.litros || 0), 0);
  const totalCosto = data.reduce((acc, curr) => acc + (curr.costo || 0), 0);
  
  const consumoPorUnidad = data.reduce((acc, curr) => {
    const unidad = curr.unidad;
    if (!acc[unidad]) {
      acc[unidad] = { litros: 0, marca: curr.marca, modelo: curr.modelo, conductores: new Set() };
    }
    acc[unidad].litros += curr.litros;
    if (curr.conductor && curr.conductor.trim() !== '' && curr.conductor !== 'Sin Asignar') {
        acc[unidad].conductores.add(curr.conductor.trim());
    }
    return acc;
  }, {});

  const topConsumers = Object.entries(consumoPorUnidad)
    .map(([unidad, datos]) => ({ 
      unidad, 
      litros: datos.litros,
      marca: datos.marca, 
      modelo: datos.modelo,
      conductores: Array.from(datos.conductores)
    }))
    .sort((a, b) => b.litros - a.litros);

  return { totalLitros, totalCosto, topConsumers };
};

export const processMonthlyData = (data) => {
  if (!data || data.length === 0) return [];

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const groupedData = {};

  data.forEach(row => {
    if (!row.fecha) return;
    let dateObj = null;
    if (row.fecha.includes('/')) {
      const [day, month, year] = row.fecha.split('/');
      const cleanYear = year ? year.split(' ')[0] : null;
      if (month && cleanYear) dateObj = new Date(cleanYear, parseInt(month) - 1, 1);
    } else {
      dateObj = new Date(row.fecha);
    }

    if (dateObj && !isNaN(dateObj)) {
      const year = dateObj.getFullYear();
      const monthIndex = dateObj.getMonth();
      const key = `${year}-${monthIndex}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          rawDate: dateObj,
          name: meses[monthIndex],
          fullName: `${mesesCompletos[monthIndex]} ${year}`,
          year: year,
          litros: 0,
          costo: 0
        };
      }
      groupedData[key].litros += row.litros;
      groupedData[key].costo += row.costo;
    }
  });

  return Object.values(groupedData)
    .sort((a, b) => a.rawDate - b.rawDate)
    .map(item => ({ 
      name: item.name, 
      fullName: item.fullName, 
      litros: Math.round(item.litros),
      costo: Math.round(item.costo)
    }))
    .slice(-12);
};