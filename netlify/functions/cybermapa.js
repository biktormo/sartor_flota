export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  let bodyPayload = {
    session: {
      user: USER,
      pwd: PASS,
      lang: "es",
      production: 1,
      temporalInvitationModeEnabled: 0,
      trackerModeEnabled: 0
    }
  };

  // --- CAMBIO AQUÍ: USAR GETLASTDATA ---
  if (endpoint === 'assets') {
    bodyPayload.FUNC = 'GETLASTDATA'; 
    bodyPayload.paramsData = {}; // Generalmente vacío trae todos
  } 
  else if (endpoint === 'history') {
    bodyPayload.FUNC = 'GETHISTORY'; 
    bodyPayload.paramsData = {
      // Nota: Si GETLASTDATA funciona, veremos cuál es el nombre real del campo ID
      // para usarlo aquí (puede ser 'uID', 'unitID', etc)
      id: patente, 
      beginDate: from, 
      endDate: to,
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://gps.commers.com.ar/StreetZ/'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      return { statusCode: response.status, body: `Error Servidor GPS: ${response.statusText}` };
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