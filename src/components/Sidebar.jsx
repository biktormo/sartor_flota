import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Users, Wrench, Map, 
  FileText, Settings, LogOut, Upload 
} from 'lucide-react';

const Sidebar = () => {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
      isActive ? 'bg-jd-green/10 text-jd-green' : 'text-gray-500 hover:bg-gray-100'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-10">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="bg-jd-green text-white p-1.5 rounded-md">
        <img 
          src="/logo.png" 
          alt="SARTOR Logo" 
          className="h-10 w-auto object-contain" // Ajusta h-8, h-10 o h-12 según el tamaño que prefieras
        />
          <Truck size={20} />
        </div>
        <div>
          <h1 className="font-bold text-gray-800 leading-none">SARTOR</h1>
          <p className="text-[10px] text-gray-400 font-medium tracking-wide">Gestión de Flota</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink to="/" className={linkClass}>
          <LayoutDashboard size={18} /> Panel General
        </NavLink>
        <NavLink to="/vehicles" className={linkClass}>
          <Truck size={18} /> Vehículos / Eficiencia
        </NavLink>
        <NavLink to="/drivers" className={linkClass}>
          <Users size={18} /> Conductores
        </NavLink>
        <NavLink to="/maintenance" className={linkClass}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Wrench size={18} /> Mantenimiento
            </div>
            <span className="bg-jd-yellow text-[10px] font-bold px-1.5 py-0.5 rounded text-sartor-dark">2</span>
          </div>
        </NavLink>
        <NavLink to="/map" className={linkClass}>
          <Map size={18} /> Mapa de Flota
        </NavLink>
        
        <div className="my-4 border-t border-gray-100"></div>
        
        <NavLink to="/upload" className={linkClass}>
          <Upload size={18} /> Cargar Datos
        </NavLink>
        <NavLink to="/reports" className={linkClass}>
          <FileText size={18} /> Reportes
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <Settings size={18} /> Configuración
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <img 
            src="https://res.cloudinary.com/dph379kxx/image/upload/v1757331830/SARTOR_Victor_Manuel_Ojeda_-_Gerente_de_Proyectos_vaxd6k.png" 
            alt="Usuario" 
            className="w-9 h-9 rounded-full object-cover border border-gray-200"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">Victor Ojeda</p>
            <p className="text-xs text-gray-400 truncate">Gerente de Proyectos</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600" title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;