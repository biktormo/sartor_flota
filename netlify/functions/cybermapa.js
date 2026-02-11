export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Estructura de sesión
  let bodyPayload = {
    session: {
      user: USER,
      pwd: PASS,
      lang: "es",
      production: 1,
      temporalInvitationModeEnabled: 0,
      trackerModeEnabled: 0
    },
    pr: "https:"
  };

  if (endpoint === 'assets') {
    // ESTO YA FUNCIONA (Trae la lista via loginPositions)
    bodyPayload.FUNC = 'INITIALIZE';
    bodyPayload.paramsData = { auditReEntry: true };
  } 
  else if (endpoint === 'history') {
    // --- CORRECCIÓN AQUÍ ---
    // Usamos el nombre exacto de la documentación
    bodyPayload.FUNC = 'DATOSHISTORICOS';
    
    // Parámetros en español según doc
    bodyPayload.paramsData = {
      vehiculo: patente, // Aquí llegará el ID numérico largo (gps)
      tipoID: 'gps',     // Especificamos que enviamos el ID de GPS
      desde: from,       // YYYY-MM-DD HH:MM:SS
      hasta: to
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Referer': 'https://gps.commers.com.ar/StreetZ/',
        'Origin': 'https://gps.commers.com.ar',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: `Error Servidor: ${text}` };
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