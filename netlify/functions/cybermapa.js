export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Headers de "disfraz"
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://gps.commers.com.ar/StreetZ/',
    'Origin': 'https://gps.commers.com.ar'
  };

  let bodyPayload = {};

  if (endpoint === 'assets') {
    // INITIALIZE trae la configuración Y la última posición de los móviles (loginPositions)
    // Es nuestra mejor opción porque no requiere cookie previa.
    bodyPayload = {
      FUNC: "INITIALIZE",
      paramsData: { auditReEntry: true },
      pr: "https:",
      session: {
        user: USER,
        pwd: PASS,
        lang: "es",
        production: 1,
        temporalInvitationModeEnabled: 0,
        trackerModeEnabled: 0
      }
    };
  } else if (endpoint === 'history') {
    // Para historial probamos GETHISTORY. Si falla por cookie, no hay alternativa simple via API REST
    // sin un proxy de cookies complejo. Pero intentemos.
    bodyPayload = {
      FUNC: "GETHISTORY",
      paramsData: {
        elementId: patente,
        beginDate: from, 
        endDate: to
      },
      session: { user: USER, pwd: PASS }
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: headers,
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