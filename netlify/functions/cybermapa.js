export const handler = async (event, context) => {
  // VOLVEMOS A LA URL QUE SÍ TE DIO RESULTADOS
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

  // 1. LISTA DE VEHÍCULOS
  if (endpoint === 'assets') {
    bodyPayload.action = 'GETVEHICULOS'; // Esta funcionó en tu captura (trajo 30 unidades)
  } 
  // 2. HISTORIAL
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    bodyPayload.vehiculo = patente; // Aquí enviaremos la PATENTE (ej: AA472RQ)
    bodyPayload.tipoID = 'patente'; 
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

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};