// Usamos 'require' en lugar de 'import' (si usaras fetch nativo de Node 18 no hace falta importarlo, pero mantenemos la estructura simple)

exports.handler = async function(event, context) {
  const API_URL = 'https://api.cybermapa.com/v1/json/';
  
  // LEER VARIABLES DE ENTORNO
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Faltan credenciales en Netlify (Environment Variables)" })
    };
  }

  // Obtener parámetros
  const params = event.queryStringParameters || {};
  const { endpoint, from, to, patente } = params;

  let bodyPayload = {
    user: USER,
    pwd: PASS
  };

  if (endpoint === 'assets') {
    bodyPayload.action = 'GETVEHICULOS';
  } 
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    bodyPayload.vehiculo = patente;
    bodyPayload.tipoID = 'patente';
    bodyPayload.desde = from;
    bodyPayload.hasta = to;
  }

  try {
    // Nota: Node.js 18+ soporta fetch nativo.
    // Si tu Netlify usa una versión vieja, esto podría fallar, pero por defecto usa la moderna.
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      return { statusCode: response.status, body: `Error HTTP: ${response.statusText}` };
    }

    const textData = await response.text();
    let data;
    try {
        data = JSON.parse(textData);
    } catch (e) {
        // A veces devuelven HTML si hay error
        return { statusCode: 502, body: JSON.stringify({ error: "Respuesta no válida del servidor GPS", raw: textData }) };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.toString() })
    };
  }
};