import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const FleetMap = ({ data, stationSettings }) => {
  const stationData = React.useMemo(() => {
    const map = {};
    
    data.forEach(row => {
      const name = row.estacion;
      if (!name || name === 'Externo') return;
      
      const config = stationSettings[name];
      if (!config || !config.lat || !config.lng) return;

      if (!map[name]) {
        map[name] = {
          name,
          lat: parseFloat(config.lat),
          lng: parseFloat(config.lng),
          // Prioridad: Localidad guardada manualmente > Localidad del CSV > 'Sin localidad'
          localidad: config.localidad || row.ciudad || 'Sin localidad',
          litros: 0,
          costo: 0,
          count: 0
        };
      }
      map[name].litros += row.litros;
      map[name].costo += row.costo;
      map[name].count += 1;
    });

    return Object.values(map);
  }, [data, stationSettings]);

  const defaultCenter = [-27.215, -61.215]; 

  return (
    <div className="h-full w-full rounded-xl overflow-hidden z-0 relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={8} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {stationData.map((station, idx) => {
          // Radio logarítmico para visualización
          const radius = Math.max(10, Math.min(50, Math.sqrt(station.litros) / 2));
          
          return (
            <CircleMarker 
              key={idx}
              center={[station.lat, station.lng]}
              pathOptions={{ color: '#367C2B', fillColor: '#367C2B', fillOpacity: 0.6 }}
              radius={radius}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="text-center">
                  <strong className="block text-sm">{station.name}</strong>
                  <span className="text-xs text-gray-500 block mb-1">{station.localidad}</span>
                  <div className="text-xs font-bold text-gray-800">
                    {station.litros.toLocaleString()} L
                  </div>
                  <div className="text-xs font-mono text-jd-green">
                    ${station.costo.toLocaleString()}
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <h3 className="font-bold text-gray-800 border-b pb-1 mb-2">{station.name}</h3>
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    📍 {station.localidad}
                  </p>
                  <p className="text-sm text-gray-600 flex justify-between">
                    <span>Litros:</span> 
                    <b className="text-gray-800">{station.litros.toLocaleString()} L</b>
                  </p>
                  <p className="text-sm text-gray-600 flex justify-between">
                    <span>Monto:</span> 
                    <b className="text-jd-green">${station.costo.toLocaleString()}</b>
                  </p>
                  <p className="text-xs text-gray-400 mt-2 text-right">{station.count} cargas</p>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow-md z-[1000] text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-jd-green opacity-60"></div>
          <span>Volumen de Carga</span>
        </div>
      </div>
    </div>
  );
};

export default FleetMap;