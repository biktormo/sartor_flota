import Papa from 'papaparse';

// --- HELPERS ---

// Limpiador estándar para Litros y Costos (respeta decimales)
const cleanNumber = (val) => {
  if (!val) return 0;
  let str = String(val).trim();
  if (str === '' || str === '-') return 0;

  // Eliminar puntos de miles
  str = str.replace(/\./g, '');
  // Reemplazar coma por punto
  str = str.replace(',', '.');

  const number = parseFloat(str);
  return isNaN(number) ? 0 : number;
};

// --- NUEVO: Limpiador Inteligente para Odómetros ---
// Detecta si el valor está expresado en "miles" (ej: 76,6) y lo corrige
const cleanOdometer = (val) => {
  let num = cleanNumber(val);
  
  // HEURÍSTICA DE FLOTA:
  // Si el odómetro es mayor a 0 pero menor a 10.000 km, es altamente probable
  // que esté formateado como "77,426" (interpretado como 77.426) en lugar de 77426.
  // Multiplicamos por 1000 para llevarlo a la escala real.
  if (num > 0 && num < 10000) {
    num = num * 1000;
  }
  
  return Math.round(num); // Los odómetros suelen ser enteros
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

const createTimestamp = (dateStr, timeStr) => {
  if (!dateStr) return 0;
  try {
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/'); 
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      
      let hours = 0, minutes = 0, seconds = 0;
      if (timeStr && timeStr.includes(':')) {
        const t = timeStr.split(':');
        hours = parseInt(t[0]||0, 10);
        minutes = parseInt(t[1]||0, 10);
        seconds = parseInt(t[2]||0, 10);
      }
      return new Date(year, month, day, hours, minutes, seconds).getTime();
    }
    return new Date(dateStr).getTime();
  } catch (e) {
    return 0;
  }
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
        let rawRecords = results.data
          .map((row, index) => {
            const ltsRaw = findValue(row, ['LITROS', 'LITRO', 'CANTIDAD']);
            if (!ltsRaw) return null;

            const litros = cleanNumber(ltsRaw);
            const costo = cleanNumber(findValue(row, ['M.N.', 'M.N', 'IMPORTE', 'NETO']) || '0');
            
            // --- USAMOS EL LIMPIADOR ESPECIAL PARA ODÓMETROS ---
            const odoAnt = cleanOdometer(findValue(row, ['ODÓMETRO ANTERIOR', 'ODOMETRO ANTERIOR']) || '0');
            const odoUlt = cleanOdometer(findValue(row, ['ÚLTIMO ODÓMETRO', 'ULTIMO ODOMETRO']) || '0');
            // ---------------------------------------------------
            
            let distancia = 0;
            if (odoUlt > odoAnt) distancia = odoUlt - odoAnt;

            const fechaRaw = findValue(row, ['FECHA', 'DATE']) || '';
            const horaRaw = findValue(row, ['HORA', 'TIME']) || '00:00:00';
            const timestamp = createTimestamp(fechaRaw, horaRaw);

            const unidad = findValue(row, ['UNIDAD', 'MOVIL', 'VEHICULO']) || 'Desconocido';
            const transaccion = findValue(row, ['TRANSACCIÓN', 'TIPO']) || 'CONSUMO';

            return {
              id: index,
              rawId: index,
              fecha: fechaRaw,
              hora: horaRaw,
              timestamp,
              unidad,
              placa: findValue(row, ['PLACA', 'PATENTE']) || '',
              marca: findValue(row, ['MARCA']) || '',
              modelo: findValue(row, ['MODELO']) || '',
              conductor: findValue(row, ['CONDUCTOR', 'CHOFER']) || 'Sin Asignar',
              litros,
              costo,
              estacion: findValue(row, ['ESTACION DE SERVICIO', 'ESTACION', 'LUGAR']) || 'Externo',
              direccion: findValue(row, ['DIRECCIÓN ESTACIÓN', 'DIRECCION']) || '',
              ciudad: findValue(row, ['CIUDAD', 'LOCALIDAD']) || '',
              odoAnt,
              odoUlt,
              distancia,
              esReversion: litros < 0 || (transaccion && transaccion.toUpperCase().includes('REVERSI'))
            };
          })
          .filter(r => r !== null && r.litros !== 0);

        // Lógica de Reversiones (se mantiene igual)
        const indicesToDelete = new Set();
        rawRecords.forEach((record) => {
          if (record.litros < 0) {
            indicesToDelete.add(record.rawId);
            const target = rawRecords.find(r => 
              !indicesToDelete.has(r.rawId) && 
              r.unidad === record.unidad && 
              Math.abs(r.litros - Math.abs(record.litros)) < 0.1 && 
              r.litros > 0
            );
            if (target) indicesToDelete.add(target.rawId);
          }
        });

        const cleanData = rawRecords.filter(r => !indicesToDelete.has(r.rawId));

        cleanData.sort((a, b) => {
           if (a.odoAnt > 0 && b.odoAnt > 0) return a.odoAnt - b.odoAnt;
           return a.timestamp - b.timestamp;
        });

        resolve(cleanData);
      },
      error: (error) => reject(error),
    });
  });
};

export const calculateKPIs = (data) => {
  if (!data || data.length === 0) return { totalLitros: 0, totalCosto: 0, topConsumers: [] };

  const totalLitros = data.reduce((acc, curr) => acc + curr.litros, 0);
  const totalCosto = data.reduce((acc, curr) => acc + curr.costo, 0);
  
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
    let dateObj = row.timestamp ? new Date(row.timestamp) : null;
    
    if (!dateObj || isNaN(dateObj.getTime())) {
       if (row.fecha && row.fecha.includes('/')) {
          const parts = row.fecha.split('/');
          dateObj = new Date(parts[2], parts[1]-1, parts[0]);
       }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const monthIndex = dateObj.getMonth();
      const key = `${year}-${monthIndex}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          rawDate: dateObj.getTime(),
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