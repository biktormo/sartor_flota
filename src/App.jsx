import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import StationsPage from './pages/StationsPage';
import { fetchDashboardData, uploadFleetData, deleteFileAndRecords } from './utils/firebaseService';
import { calculateKPIs } from './utils/dataProcessor';
import GapsPage from './pages/GapsPage';
import GpsComparisonPage from './pages/GpsComparisonPage';
import GpsReportPage from './pages/GpsReportPage';

function App() {
  const [fleetData, setFleetData] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [kpis, setKpis] = useState({ totalLitros: 0, totalCosto: 0, topConsumers: [] });
  const [loading, setLoading] = useState(true);
  
  // ESTADO PARA EL MENÚ MÓVIL
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadDataFromCloud();
  }, []);

  const loadDataFromCloud = async () => {
    setLoading(true);
    try {
      const { history, records } = await fetchDashboardData();
      setUploadHistory(history);
      setFleetData(records);
      const computedKpis = calculateKPIs(records);
      setKpis(computedKpis);
    } catch (error) {
      console.error("Error cargando de Firebase:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (parsedData, computedKpis, fileName) => {
    try {
      await uploadFleetData(fileName, parsedData);
      await loadDataFromCloud();
      alert("Datos guardados en la nube exitosamente.");
    } catch (error) {
      alert("Error al guardar en la nube.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quieres borrar este archivo?")) {
      try {
        await deleteFileAndRecords(id);
        await loadDataFromCloud();
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Cargando SARTOR...</div>;

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-sartor-gray overflow-hidden">
        
        {/* SIDEBAR RESPONSIVO: Pasamos el estado y la función de cierre */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* CONTENEDOR PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300">
          
          {/* HEADER RESPONSIVO: Pasamos la función para abrir el menú */}
          <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-sartor-gray scroll-smooth">
            <Routes>
              <Route path="/" element={<Dashboard data={fleetData} kpis={kpis} />} />
              <Route path="/vehicles" element={<VehiclesPage data={fleetData} />} />
              <Route path="/drivers" element={<DriversPage data={fleetData} />} />
              <Route path="/map" element={<StationsPage data={fleetData} />} />
              <Route path="/upload" element={<UploadPage onUploadToCloud={handleUpload} history={uploadHistory} onDelete={handleDelete} />} />
              <Route path="*" element={<div className="p-10 text-center text-gray-500">Página en construcción</div>} />
              <Route path="/gaps" element={<GapsPage data={fleetData} />} />
              <Route path="/gps-check" element={<GpsComparisonPage data={fleetData} />} />
              <Route path="/gps-reports" element={<GpsReportPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;