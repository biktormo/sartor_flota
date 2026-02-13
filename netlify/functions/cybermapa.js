export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/API/WService.js';
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  let bodyPayload = { user: USER, pwd: PASS };

  // 1. LISTA (Funciona)
  if (endpoint === 'assets') {
    bodyPayload.action = 'DATOSACTUALES';
  } 
  
  // 2. HISTORIAL
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    // Importante: 'patente' en los params de query, pero aquí lo mapeamos a 'vehiculo'
    // Ahora recibiremos el ID numérico (ej: 8652...)
    bodyPayload.vehiculo = patente; 
    bodyPayload.tipoID = 'gps'; // Coincide con el tipo de dato numérico
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

    // Verificación de error lógico
    if (data.status === 'rechazado' || data.error) {
       console.log("Error API Lógico:", data);
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