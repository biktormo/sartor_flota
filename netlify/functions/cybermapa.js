export const handler = async (event, context) => {
  // Probamos la URL global estándar de la documentación que me pasaste
  const API_URL = 'https://api.cybermapa.com/v1/json/';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  let bodyPayload = {
    user: USER,
    pwd: PASS
  };

  if (endpoint === 'assets') {
    bodyPayload.action = 'GETVEHICULOS';
    // No enviamos más parámetros para traer todo
  } 
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    bodyPayload.vehiculo = patente; 
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
      return { statusCode: response.status, body: `Error HTTP: ${response.statusText}` };
    }

    const textData = await response.text();
    
    // Intentar parsear JSON
    let data;
    try {
        data = JSON.parse(textData);
    } catch (e) {
        // Si falla el parseo, devolvemos el texto para ver qué error da el servidor
        return { statusCode: 502, body: JSON.stringify({ error: "Respuesta no JSON", raw: textData }) };
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