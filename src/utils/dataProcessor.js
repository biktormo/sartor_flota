import Papa from 'papaparse';

// --- HELPERS ---

// 1. Limpiador de números FORMATO ARGENTINA ESTRICTO (1.000,00)
const cleanNumber = (val) => {
  if (!val) return 0;
  let str = String(val).trim();
  if (str === '' || str === '-') return 0;

  // Si detectamos formato europeo/argentino (puntos antes que comas, o solo comas)
  // Ej: 1.250,50 o 34,5
  
  // Primero: Quitar TODOS los puntos (separadores de miles)
  str = str.replace(/\./g, '');
  
  // Segundo: Reemplazar la coma decimal por punto (para JS)
  str = str.replace(',', '.');

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

const createTimestamp = (dateStr, timeStr) => {
  if (!dateStr) return 0;
  try {
    // Intentar formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/'); // Ignorar hora si viene pegada
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
        // A. PRIMER PASE: Mapeo y Limpieza Básica
        let rawRecords = results.data
          .map((row, index) => {
            const ltsRaw = findValue(row, ['LITROS', 'LITRO', 'CANTIDAD']);
            if (!ltsRaw) return null;

            const litros = cleanNumber(ltsRaw);
            const costo = cleanNumber(findValue(row, ['M.N.', 'M.N', 'IMPORTE', 'NETO']) || '0');
            
            // Odómetros
            const odoAnt = cleanNumber(findValue(row, ['ODÓMETRO ANTERIOR', 'ODOMETRO ANTERIOR']) || '0');
            const odoUlt = cleanNumber(findValue(row, ['ÚLTIMO ODÓMETRO', 'ULTIMO ODOMETRO']) || '0');
            
            // Distancia del tramo (Dato interno)
            let distancia = 0;
            if (odoUlt > odoAnt) distancia = odoUlt - odoAnt;

            // Fechas
            const fechaRaw = findValue(row, ['FECHA', 'DATE']) || '';
            const horaRaw = findValue(row, ['HORA', 'TIME']) || '00:00:00';
            const timestamp = createTimestamp(fechaRaw, horaRaw);

            // Datos Extra
            const unidad = findValue(row, ['UNIDAD', 'MOVIL', 'VEHICULO']) || 'Desconocido';
            const transaccion = findValue(row, ['TRANSACCIÓN', 'TIPO']) || 'CONSUMO';

            return {
              id: index, // ID temporal
              rawId: index, // Para rastrear eliminaciones
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
          .filter(r => r !== null && r.litros !== 0); // Quitar filas vacías o litros 0

        // B. SEGUNDO PASE: Lógica de Reversiones (Eliminar la anulación y la carga original)
        // Estrategia: Identificar negativos y buscar su par positivo (misma unidad, mismo valor abs)
        const indicesToDelete = new Set();

        rawRecords.forEach((record, idx) => {
          if (record.litros < 0) {
            // Es una reversión. Marcamos esta fila para borrar.
            indicesToDelete.add(record.rawId);

            // Buscamos la fila positiva correspondiente
            // Debe ser: misma unidad, mismos litros (en positivo), y anterior o igual en fecha
            const target = rawRecords.find(r => 
              !indicesToDelete.has(r.rawId) && // Que no esté borrada ya
              r.unidad === record.unidad && 
              Math.abs(r.litros - Math.abs(record.litros)) < 0.1 && // Tolerancia decimal
              r.litros > 0
            );

            if (target) {
              indicesToDelete.add(target.rawId); // Borramos también la positiva
            }
          }
        });

        // Filtrar las marcadas
        const cleanData = rawRecords.filter(r => !indicesToDelete.has(r.rawId));

        // Ordenar por Odómetro (Físico) por defecto
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

// Arreglo para que el gráfico mensual siempre funcione
export const processMonthlyData = (data) => {
  if (!data || data.length === 0) return [];

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const groupedData = {};

  data.forEach(row => {
    // Si no hay timestamp, intentamos usar fecha string
    let dateObj = row.timestamp ? new Date(row.timestamp) : null;
    
    // Fallback de seguridad
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