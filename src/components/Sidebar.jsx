import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Users, Wrench, Map, 
  FileText, Settings, LogOut, Upload, X, Download, 
  FileSearch, Satellite, Route as RouteIcon // <--- AQUÍ ESTABA EL FALTANTE (Aliased)
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
      isActive ? 'bg-jd-green/10 text-jd-green' : 'text-gray-500 hover:bg-gray-100'
    }`;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={onClose}
        ></div>
      )}

      <aside className={`
        fixed left-0 top-0 z-30 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        
        {/* LOGO */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 bg-white relative">
          <img 
            src="/logo.png" 
            alt="SARTOR Logo" 
            className="h-10 w-auto object-contain" 
            onError={(e) => {
                e.target.style.display = 'none';
                document.getElementById('fallback-logo').style.display = 'block';
            }}
          />
          <h1 id="fallback-logo" className="hidden font-extrabold text-2xl text-jd-green tracking-tighter">SARTOR</h1>
          
          <button onClick={onClose} className="md:hidden text-gray-500 absolute right-4">
            <X size={24} />
          </button>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div onClick={() => window.innerWidth < 768 && onClose()}>
            <NavLink to="/" className={linkClass}><LayoutDashboard size={18} /> Panel General</NavLink>
            <NavLink to="/vehicles" className={linkClass}><Truck size={18} /> Vehículos / Eficiencia</NavLink>
            <NavLink to="/drivers" className={linkClass}><Users size={18} /> Conductores</NavLink>
            <NavLink to="/maintenance" className={linkClass}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3"><Wrench size={18} /> Mantenimiento</div>
                <span className="bg-jd-yellow text-[10px] font-bold px-1.5 py-0.5 rounded text-sartor-dark">2</span>
              </div>
            </NavLink>
            <NavLink to="/map" className={linkClass}><Map size={18} /> Mapa de Flota</NavLink>
            
            {/* HERRAMIENTAS AVANZADAS */}
            <div className="my-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Auditoría</div>
            
            <NavLink to="/gaps" className={linkClass}><FileSearch size={18} /> Diferencias (Odómetro)</NavLink>
            <NavLink to="/gps-check" className={linkClass}><Satellite size={18} /> Control GPS vs Surtidor</NavLink>
            <NavLink to="/gps-reports" className={linkClass}><RouteIcon size={18} /> Análisis de Recorrido</NavLink>

            <div className="my-4 border-t border-gray-100"></div>
            
            <NavLink to="/upload" className={linkClass}><Upload size={18} /> Cargar Datos</NavLink>
            <NavLink to="/reports" className={linkClass}><FileText size={18} /> Reportes</NavLink>
            <NavLink to="/settings" className={linkClass}><Settings size={18} /> Configuración</NavLink>
          </div>

          {/* BOTÓN DE INSTALAR */}
          {deferredPrompt && (
            <div className="mt-4 px-3">
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 bg-jd-green text-white py-2 rounded-lg text-sm font-bold shadow-md hover:bg-green-800 transition-colors"
              >
                <Download size={16} /> Instalar App
              </button>
            </div>
          )}
        </nav>

        {/* PERFIL */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.pravatar.cc/150?img=11" 
              alt="Usuario" 
              className="w-9 h-9 rounded-full object-cover border border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">Juan Pérez</p>
              <p className="text-xs text-gray-400 truncate">Jefe de Taller</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600" title="Cerrar Sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;