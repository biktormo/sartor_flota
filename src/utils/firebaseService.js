import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, writeBatch, query, where } from 'firebase/firestore';

// Colecciones
const FILES_COLLECTION = 'uploads_history'; // Metadatos del archivo
const RECORDS_COLLECTION = 'fuel_records';  // Los registros individuales del CSV
const SETTINGS_COLLECTION = 'vehicle_settings';

// 1. Obtener todos los datos para el Dashboard
export const fetchDashboardData = async () => {
  try {
    // Obtenemos historial
    const historySnapshot = await getDocs(collection(db, FILES_COLLECTION));
    const history = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Obtenemos TODOS los registros de combustible
    // Nota: En una app real con millones de datos, aquí usarías filtros/paginación
    const recordsSnapshot = await getDocs(collection(db, RECORDS_COLLECTION));
    const records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { history, records };
  } catch (error) {
    console.error("Error obteniendo datos:", error);
    throw error;
  }
};

// 2. Subir un nuevo archivo y sus registros
export const uploadFleetData = async (fileName, rawData) => {
  try {
    // A. Guardar metadatos del archivo en el historial
    const fileDoc = await addDoc(collection(db, FILES_COLLECTION), {
      name: fileName,
      date: new Date().toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      rows: rawData.length,
      size: (JSON.stringify(rawData).length / 1024).toFixed(2) + ' KB',
      uploadedAt: new Date()
    });

    const fileId = fileDoc.id;

    // B. Guardar los registros individuales usando Batches (Lotes)
    // Firestore permite max 500 operaciones por lote. Si el CSV es grande, dividimos.
    const chunkSize = 450; 
    for (let i = 0; i < rawData.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = rawData.slice(i, i + chunkSize);

      chunk.forEach((row) => {
        const docRef = doc(collection(db, RECORDS_COLLECTION)); // ID automático
        batch.set(docRef, { 
          ...row, 
          fileId: fileId // Vinculamos el registro al archivo padre
        }); 
      });

      await batch.commit();
    }

    return fileId;
  } catch (error) {
    console.error("Error subiendo datos:", error);
    throw error;
  }
};

// 3. Borrar un archivo y sus registros asociados
export const deleteFileAndRecords = async (fileId) => {
  try {
    // A. Borrar la entrada del historial
    await deleteDoc(doc(db, FILES_COLLECTION, fileId));

    // B. Borrar todos los registros que tengan ese fileId
    const q = query(collection(db, RECORDS_COLLECTION), where("fileId", "==", fileId));
    const querySnapshot = await getDocs(q);

    // Borramos en lotes
    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error borrando:", error);
    throw error;
  }
};

// 4. Obtener configuraciones de vehículos
export const fetchVehicleSettings = async () => {
  try {
    const snapshot = await getDocs(collection(db, SETTINGS_COLLECTION));
    const settings = {};
    snapshot.forEach(doc => {
      settings[doc.id] = doc.data(); // doc.id será el nombre de la unidad (ej: "JD 8R 410")
    });
    return settings;
  } catch (error) {
    console.error("Error obteniendo configuraciones:", error);
    return {};
  }
};

// 5. Guardar configuraciones (Batch para eficiencia)
export const saveVehicleSettings = async (settingsArray) => {
  try {
    const batch = writeBatch(db);
    
    settingsArray.forEach(item => {
      const docRef = doc(db, SETTINGS_COLLECTION, item.id);
      batch.set(docRef, {
        centroCosto: item.centroCosto,
        localidad: item.localidad,
        updatedAt: new Date()
      }, { merge: true });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error guardando configuraciones:", error);
    throw error;
  }
};

// Colección para configuraciones de estaciones
const STATIONS_COLLECTION = 'station_settings';

// 6. Obtener configuraciones de estaciones (GPS)
export const fetchStationSettings = async () => {
  try {
    const snapshot = await getDocs(collection(db, STATIONS_COLLECTION));
    const settings = {};
    snapshot.forEach(doc => {
      settings[doc.id] = doc.data(); // ID es el nombre de la estación
    });
    return settings;
  } catch (error) {
    console.error("Error obteniendo estaciones:", error);
    return {};
  }
};

// 7. Guardar configuraciones de estaciones
export const saveStationSettings = async (settingsArray) => {
  try {
    const batch = writeBatch(db);
    settingsArray.forEach(item => {
      // Usamos el nombre de la estación como ID del documento (sanitizado si es necesario, pero Firestore aguanta strings)
      // Si el nombre tiene "/" o caracteres raros, Firestore podría quejarse, pero por ahora asumimos nombres normales.
      const docRef = doc(db, STATIONS_COLLECTION, item.id);
      batch.set(docRef, {
        lat: item.lat,
        lng: item.lng,
        localidad: item.localidad || '',
        direccion: item.direccion || '',
        updatedAt: new Date()
      }, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error guardando estaciones:", error);
    throw error;
  }
};