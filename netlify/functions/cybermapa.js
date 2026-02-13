export const handler = async (event, context) => {
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

  // --- CONFIGURACIÓN DE ACCIONES SEGÚN DOCUMENTACIÓN ---
  
  if (endpoint === 'assets') {
    // Según la tabla de documentación oficial:
    bodyPayload.action = 'DATOSACTUALES';
    // Opcional: Pedir campos extra si la API lo permite
    // bodyPayload.output = ['patente', 'alias', 'id_gps']; 
  } 
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    bodyPayload.vehiculo = patente; // ID o Patente
    bodyPayload.tipoID = 'patente'; // Probamos con 'patente', si falla cambiamos a 'gps'
    bodyPayload.desde = from;
    bodyPayload.hasta = to;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.log("Error API Status:", response.status, text);
      return { statusCode: response.status, body: `Error API (${response.status}): ${text}` };
    }

    const data = await response.json();

    // Verificación de error lógico dentro del JSON (ej: usuario incorrecto)
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