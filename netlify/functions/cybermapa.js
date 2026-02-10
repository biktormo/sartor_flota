export const handler = async (event, context) => {
  // Según la documentación de Cybermapa/StreetZ, el endpoint API suele estar en /json/
  const API_URL = 'https://gps.commers.com.ar/StreetZ/json/';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // 1. Construimos el Payload EXACTO de la documentación
  let bodyPayload = {
    user: USER,
    pwd: PASS
  };

  if (endpoint === 'assets') {
    // Según tu imagen: # GETVEHICULOS
    bodyPayload.action = 'GETVEHICULOS';
  } 
  else if (endpoint === 'history') {
    // Según tu imagen: Datos Historicos -> DATOSHISTORICOS
    bodyPayload.action = 'DATOSHISTORICOS';
    // Parámetros obligatorios según doc:
    bodyPayload.vehiculo = patente; 
    bodyPayload.desde = from;
    bodyPayload.hasta = to;
    // Opcionales útiles:
    bodyPayload.tipoID = 'patente'; 
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
        // No enviamos cookies ni referer, la API documental no debería pedirlos
      },
      body: JSON.stringify(bodyPayload)
    });

    // Si la URL /json/ da 404, devolveremos un mensaje claro para probar otra URL
    if (response.status === 404) {
        return { statusCode: 404, body: "La URL de la API (/json/) no existe en este servidor." };
    }

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