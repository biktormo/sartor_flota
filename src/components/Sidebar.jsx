import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Users, Wrench, Map, 
  FileText, Settings, LogOut, Upload, X, Download, Satellite 
} from 'lucide-react';
import { FileSearch } from 'lucide-react';
import { Route as RouteIcon } from 'lucide-react'; // <--- Usamos un alias para no chocar con el Route de react-router

const Sidebar = ({ isOpen, onClose }) => {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
      isActive ? 'bg-jd-green/10 text-jd-green' : 'text-gray-500 hover:bg-gray-100'
    }`;

  return (
    <>
      {/* OVERLAY OSCURO (Solo móvil) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={onClose}
        ></div>
      )}

      {/* BARRA LATERAL */}
      <aside className={`
        fixed left-0 top-0 z-30 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        
        {/* LOGO + BOTÓN CERRAR (Móvil) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-center w-full md:w-auto">
            <img 
              src="/logo.png" 
              alt="SARTOR" 
              className="h-10 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          {/* Botón X solo visible en móvil */}
          <button onClick={onClose} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {/* Al hacer clic en un link en móvil, cerramos el menú */}
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
            <NavLink to="/gaps" className={linkClass}><FileSearch size={18} /> Auditoría / Diferencias</NavLink>
            <NavLink to="/gps-check" className={linkClass}><Satellite size={18} /> Control GPS</NavLink>
            <div className="my-4 border-t border-gray-100"></div>
            <NavLink to="/upload" className={linkClass}><Upload size={18} /> Cargar Datos</NavLink>
            <NavLink to="/reports" className={linkClass}><FileText size={18} /> Reportes</NavLink>
            <NavLink to="/settings" className={linkClass}><Settings size={18} /> Configuración</NavLink>
            <NavLink to="/gaps" className={linkClass}><FileSearch size={18} /> Auditoría / Diferencias</NavLink>
            <NavLink to="/gps-reports" className={linkClass}><RouteIcon size={18} /> Análisis GPS</NavLink>
          </div>
        </nav>

        {/* PERFIL */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <img src="https://res.cloudinary.com/dph379kxx/image/upload/v1757331830/SARTOR_Victor_Manuel_Ojeda_-_Gerente_de_Proyectos_vaxd6k.png" alt="User" className="w-9 h-9 rounded-full border border-gray-200"/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">Victor Ojeda</p>
              <p className="text-xs text-gray-400 truncate">Gerente de Proyectos</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;