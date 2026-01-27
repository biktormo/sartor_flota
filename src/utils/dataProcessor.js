import Papa from 'papaparse';

// --- HELPERS ---

const cleanNumber = (val) => {
  if (!val) return 0;
  let str = val.toString().trim();
  if (str === '' || str === '-') return 0;
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

// Generador de Timestamp seguro
const createTimestamp = (dateStr, timeStr) => {
  if (!dateStr) return 0;
  try {
    // Formato esperado: DD/MM/YYYY
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
      let hours = 0, minutes = 0, seconds = 0;
      if (timeStr && timeStr.includes(':')) {
        const timeParts = timeStr.split(':').map(num => parseInt(num, 10));
        hours = timeParts[0] || 0;
        minutes = timeParts[1] || 0;
        seconds = timeParts[2] || 0;
      }
      return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
    }
    // Fallback para otros formatos
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
        // Map preliminar para limpieza
        const mappedData = results.data
          .map((row, index) => {
            const lts = findValue(row, ['LITROS', 'LITRO', 'CANTIDAD']);
            // Si no hay litros, marcamos para borrar
            if (!lts) return null;

            const costoRaw = findValue(row, ['M.N.', 'M.N', 'IMPORTE', 'NETO', 'COSTO']) || '0';
            const litrosRaw = lts;
            
            const odoAntRaw = findValue(row, ['ODÓMETRO ANTERIOR', 'ODOMETRO ANTERIOR']) || '0';
            const odoUltRaw = findValue(row, ['ÚLTIMO ODÓMETRO', 'ULTIMO ODOMETRO']) || '0';
            
            const odoAnt = cleanNumber(odoAntRaw);
            const odoUlt = cleanNumber(odoUltRaw);
            
            // Distancia interna
            let distancia = 0;
            if (odoUlt > odoAnt) {
                distancia = odoUlt - odoAnt;
            }

            const unidadRaw = findValue(row, ['UNIDAD', 'MOVIL', 'VEHICULO']) || 'Desconocido';
            const conductorRaw = findValue(row, ['CONDUCTOR', 'CHOFER']) || 'Sin Asignar';
            const estacionRaw = findValue(row, ['ESTACION DE SERVICIO', 'ESTACION', 'LUGAR', 'DIRECCION ESTACION']) || 'Externo';
            const direccionRaw = findValue(row, ['DIRECCIÓN ESTACIÓN', 'DIRECCION']) || '';
            const ciudadRaw = findValue(row, ['CIUDAD', 'LOCALIDAD']) || '';
            const marcaRaw = findValue(row, ['MARCA']) || '';
            const modeloRaw = findValue(row, ['MODELO']) || '';
            
            const fechaRaw = findValue(row, ['FECHA', 'DATE']) || '';
            const horaRaw = findValue(row, ['HORA', 'TIME']) || '00:00:00';
            const timestamp = createTimestamp(fechaRaw, horaRaw);

            return {
              id: index, // ID temporal, luego se filtra
              fecha: fechaRaw,
              hora: horaRaw,
              timestamp,
              unidad: unidadRaw,
              placa: findValue(row, ['PLACA', 'PATENTE']) || '',
              marca: marcaRaw,
              modelo: modeloRaw,
              conductor: conductorRaw,
              litros: cleanNumber(litrosRaw),
              costo: cleanNumber(costoRaw),
              estacion: estacionRaw,
              direccion: direccionRaw,
              ciudad: ciudadRaw,
              odoAnt,
              odoUlt,
              distancia
            };
          })
          .filter(item => item !== null && item.litros > 0); // 1. Eliminar nulos y litros 0

        // 2. ELIMINAR DUPLICADOS EXACTOS
        // Creamos un "Set" de firmas únicas para detectar repetidos
        const seen = new Set();
        const uniqueData = mappedData.filter(item => {
          // La "firma" de un registro es la combinación de sus datos clave
          const signature = `${item.timestamp}-${item.unidad}-${item.litros}-${item.odoAnt}`;
          if (seen.has(signature)) {
            return false; // Es duplicado, lo saltamos
          }
          seen.add(signature);
          return true; // Es nuevo, lo guardamos
        });

        resolve(uniqueData);
      },
      error: (error) => reject(error),
    });
  });
};

export const calculateKPIs = (data) => {
  if (!data || data.length === 0) return { totalLitros: 0, totalCosto: 0, topConsumers: [] };

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

// --- ARREGLO PARA GRÁFICO MENSUAL ---
export const processMonthlyData = (data) => {
  if (!data || data.length === 0) return [];

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const groupedData = {};

  data.forEach(row => {
    // Usamos el timestamp calculado previamente que es más seguro
    if (!row.timestamp) return;
    
    const dateObj = new Date(row.timestamp);

    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const monthIndex = dateObj.getMonth();
      const key = `${year}-${monthIndex}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          rawDate: dateObj.getTime(), // Guardamos numérico para ordenar fácil
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