import React from 'react';
import { Search, Bell, Plus, Menu } from 'lucide-react'; // Importar Menu

const Header = ({ onToggleSidebar }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      
      {/* IZQUIERDA: Botón Menú + Título */}
      <div className="flex items-center gap-4">
        {/* Botón Hamburguesa (Solo Móvil) */}
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
        >
          <Menu size={24} />
        </button>

        <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">Resumen</h2>
        <div className="hidden md:block h-6 w-px bg-gray-200 mx-2"></div>
        <p className="hidden md:block text-xs text-gray-400">Última act.: Hoy</p>
      </div>

      {/* DERECHA: Acciones */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Buscador (Oculto en móvil muy pequeño) */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="bg-gray-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-jd-green/50 w-32 md:w-64"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <button className="bg-jd-green hover:bg-green-800 text-white px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap">
          <Plus size={16} />
          <span className="hidden md:inline">Nueva Entrada</span>
          <span className="md:hidden">Nuevo</span>
        </button>
      </div>
    </header>
  );
};

export default Header;