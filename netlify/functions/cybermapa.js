export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Estructura base del Payload
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

  // --- LÓGICA DE FUNCIONES (FUNC) ---
  if (endpoint === 'assets') {
    bodyPayload.FUNC = 'INITIALIZE';
    bodyPayload.paramsData = {
      auditReEntry: true // Parámetro visto en la captura
    };
  } 
  else if (endpoint === 'history') {
    // Para historial, la FUNC será probablemente 'GETHISTORY' o similar
    // Mantenemos la estructura que teníamos antes, ajustando si es necesario
    bodyPayload.FUNC = 'GETHISTORY'; 
    bodyPayload.paramsData = {
      id: patente, // Suponemos que pide el ID del vehículo
      beginDate: from, 
      endDate: to,
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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