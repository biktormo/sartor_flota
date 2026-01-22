import React, { useState } from 'react';
import { parseCSV, calculateKPIs } from '../utils/dataProcessor';
import { UploadCloud, FileText, Trash2, Clock, Database, Loader2 } from 'lucide-react';

const UploadPage = ({ onUploadToCloud, history, onDelete }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        const parsedData = await parseCSV(file);
        const kpis = calculateKPIs(parsedData);
        // Enviamos a App.jsx para que lo suba a Firebase
        await onUploadToCloud(parsedData, kpis, file.name);
      } catch (error) {
        console.error(error);
        alert("Error procesando el archivo.");
      } finally {
        setIsUploading(false);
        event.target.value = null; // Reset input
      }
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1000px] mx-auto">
      
      {/* Área de Carga */}
      <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center relative overflow-hidden">
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
            <Loader2 className="animate-spin text-jd-green mb-2" size={40} />
            <p className="text-sm font-bold text-gray-600">Sincronizando con la nube...</p>
          </div>
        )}

        <div className="w-16 h-16 bg-green-50 text-jd-green rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Subir Reporte de Consumo</h2>
        <p className="text-gray-500 mb-6 text-sm">
            Los datos se guardarán en la nube y estarán accesibles para todos los usuarios.
        </p>
        
        <label className={`bg-jd-green hover:bg-green-800 text-white font-bold py-2.5 px-6 rounded-lg cursor-pointer transition-all shadow-md inline-flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <span>{isUploading ? 'Subiendo...' : 'Seleccionar Archivo CSV'}</span>
          <input type="file" accept=".csv" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
        </label>
      </div>

      {/* Historial desde Firebase */}
      {history && history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Database size={18} /> Historial en la Nube
            </h3>
            <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border">
              {history.length} archivos
            </span>
          </div>
          
          <div className="divide-y divide-gray-100">
            {history.map((file) => (
              <div key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{file.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1"><Clock size={10} /> {file.date}</span>
                      <span>•</span>
                      <span>{file.rows} registros</span>
                      <span>•</span>
                      <span>{file.size}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onDelete(file.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar de la nube"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;