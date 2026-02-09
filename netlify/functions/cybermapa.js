export const handler = async (event, context) => {
  // URL exacta que descubrimos en la inspección
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Payload Base
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

  // 1. INTENTO DE OBTENER ACTIVOS
  // Usamos 'GETLASTDATA' que es el estándar para traer móviles. 
  // Si esto falla, probaremos 'INITIALIZE' como plan B, pero primero necesitamos pasar el 403.
  if (endpoint === 'assets') {
    bodyPayload.FUNC = 'GETLASTDATA';
    bodyPayload.paramsData = {};
  } 
  else if (endpoint === 'history') {
    bodyPayload.FUNC = 'GETHISTORY';
    bodyPayload.paramsData = {
      elementId: patente,
      beginDate: from,
      endDate: to,
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        // --- LOS DISFRACES ---
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://gps.commers.com.ar',
        'Referer': 'https://gps.commers.com.ar/StreetZ/',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(bodyPayload)
    });

    // Si devuelve 403, devolvemos el texto del error para entender por qué
    if (!response.ok) {
      const text = await response.text();
      console.log("Error API:", text);
      return { statusCode: response.status, body: `Error Servidor GPS (${response.status}): ${text.substring(0, 200)}` };
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