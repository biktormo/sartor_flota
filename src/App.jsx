import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import VehiclesPage from './pages/VehiclesPage';
import StationsPage from './pages/StationsPage';
import DriversPage from './pages/DriversPage';

// Importamos el servicio y el calculador
import { fetchDashboardData, uploadFleetData, deleteFileAndRecords } from './utils/firebaseService';
import { calculateKPIs } from './utils/dataProcessor';

function App() {
  const [fleetData, setFleetData] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [kpis, setKpis] = useState({ totalLitros: 0, totalCosto: 0, topConsumers: [] });
  const [loading, setLoading] = useState(true);

  // Cargar datos desde Firebase al iniciar
  useEffect(() => {
    loadDataFromCloud();
  }, []);

  const loadDataFromCloud = async () => {
    setLoading(true);
    try {
      const { history, records } = await fetchDashboardData();
      
      // Ordenar historial por fecha (opcional, si guardaste timestamp)
      setUploadHistory(history);
      setFleetData(records);
      
      // Recalcular KPIs con todos los datos combinados
      const computedKpis = calculateKPIs(records);
      setKpis(computedKpis);
      
    } catch (error) {
      console.error("Error cargando de Firebase:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (parsedData, computedKpis, fileName) => {
    // 1. Subir a Firebase
    try {
      await uploadFleetData(fileName, parsedData);
      // 2. Recargar todo desde la nube para asegurar sincronización
      await loadDataFromCloud();
      alert("Datos guardados en la nube exitosamente.");
    } catch (error) {
      alert("Error al guardar en la nube.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quieres borrar este archivo y todos sus datos asociados?")) {
      try {
        await deleteFileAndRecords(id);
        await loadDataFromCloud(); // Refrescar vista
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Cargando datos de flota SARTOR...</div>;
  }

  return (
    <BrowserRouter>
      <div className="flex font-sans bg-sartor-gray min-h-screen text-gray-800">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard data={fleetData} kpis={kpis} />} />
              <Route path="/vehicles" element={<VehiclesPage data={fleetData} />} />
              <Route path="/map" element={<StationsPage data={fleetData} />} />
              <Route path="/drivers" element={<DriversPage data={fleetData} />} />
              <Route 
                path="/upload" 
                element={
                  <UploadPage 
                    onUploadToCloud={handleUpload} 
                    history={uploadHistory} 
                    onDelete={handleDelete} 
                  />
                } 
              />
              <Route path="*" element={<div className="p-10 text-center text-gray-500">Página en construcción</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;