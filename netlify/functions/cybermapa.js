export const handler = async (event, context) => {
  // URL OFICIAL DE LA API (Según documentación WService)
  const API_URL = 'https://gps.commers.com.ar/API/WService.js';
  
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Payload Base
  let bodyPayload = {
    user: USER,
    pwd: PASS
  };

  // --- 1. LISTA DE VEHÍCULOS ---
  if (endpoint === 'assets') {
    // Usamos DATOSACTUALES como indica la documentación oficial
    bodyPayload.action = 'DATOSACTUALES';
  } 
  
  // --- 2. HISTORIAL ---
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    bodyPayload.vehiculo = patente; // Enviamos el ID numérico (gps)
    bodyPayload.tipoID = 'gps';     // Importante: tipoID 'gps' para ID numérico
    bodyPayload.desde = from;
    bodyPayload.hasta = to;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: `Error API: ${text}` };
    }

    const data = await response.json();

    // Verificación de errores lógicos de la API
    if (data.status === 'rechazado' || data.error) {
       console.log("Error API Lógico:", data);
       // Si DATOSACTUALES falla, un último intento sería LISTAUNIDADES, 
       // pero la doc dice DATOSACTUALES.
       return { statusCode: 400, body: JSON.stringify(data) };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};