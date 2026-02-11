export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Headers base que simulan ser un navegador
  const baseHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://gps.commers.com.ar/StreetZ/',
    'Origin': 'https://gps.commers.com.ar'
  };

  // Payload de sesión que ya sabemos que funciona
  const sessionData = {
    user: USER,
    pwd: PASS,
    lang: "es",
    production: 1,
    temporalInvitationModeEnabled: 0,
    trackerModeEnabled: 0
  };

  try {
    // --- PASO 1: LOGIN (INITIALIZE) PARA OBTENER LA COOKIE DE SESIÓN ---
    const loginPayload = {
      FUNC: "INITIALIZE",
      paramsData: { auditReEntry: true },
      pr: "https:",
      session: sessionData
    };

    const loginRes = await fetch(API_URL, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(loginPayload)
    });

    if (!loginRes.ok) throw new Error(`Login falló: ${loginRes.status}`);
    
    // Capturamos la cookie 'JSESSIONID' que es la que importa
    const cookies = loginRes.headers.get('set-cookie');
    if (!cookies) throw new Error("No se pudo obtener la cookie de sesión.");

    // --- PASO 2: PEDIR LOS DATOS REALES USANDO LA COOKIE ---
    let targetPayload = {
      session: sessionData,
      pr: "https:"
    };

    if (endpoint === 'assets') {
      targetPayload.FUNC = 'GETLASTDATA'; 
      targetPayload.paramsData = {};
    } else if (endpoint === 'history') {
      targetPayload.FUNC = 'GETHISTORY';
      targetPayload.paramsData = {
          elementId: patente,
          beginDate: from, 
          endDate: to
      };
    }

    const dataRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Cookie': cookies // Pasamos la cookie capturada
      },
      body: JSON.stringify(targetPayload)
    });

    if (!dataRes.ok) {
      const errorTxt = await dataRes.text();
      return { statusCode: dataRes.status, body: `Error en la petición de datos: ${errorTxt}` };
    }

    const json = await dataRes.json();
    
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(json)
    };

  } catch (error) {
    console.error("Error en la función Netlify:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};