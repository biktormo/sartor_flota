export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Headers base para parecer un navegador real
  const baseHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://gps.commers.com.ar/StreetZ/',
    'Origin': 'https://gps.commers.com.ar'
  };

  const sessionData = {
    user: USER,
    pwd: PASS,
    lang: "es",
    production: 1,
    temporalInvitationModeEnabled: 0,
    trackerModeEnabled: 0
  };

  try {
    // --- PASO 1: LOGIN (INITIALIZE) ---
    console.log("1. Iniciando sesión...");
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

    // EXTRACCIÓN DE COOKIES (CRÍTICO)
    // Node.js 18+ soporta .getSetCookie(), si no, usamos .get('set-cookie')
    let cookies = [];
    if (typeof loginRes.headers.getSetCookie === 'function') {
        cookies = loginRes.headers.getSetCookie();
    } else {
        const rawCookie = loginRes.headers.get('set-cookie');
        if (rawCookie) cookies = [rawCookie];
    }
    
    const cookieHeader = cookies.join('; '); // Unimos todas las cookies
    console.log("2. Cookies obtenidas:", cookieHeader ? "SÍ" : "NO");

    // --- PASO 2: PEDIR DATOS (GETLASTDATA / GETHISTORY) ---
    let targetPayload = {
      session: sessionData, // Reenviamos sesión por si acaso
      pr: "https:"
    };

    if (endpoint === 'assets') {
      // Esta función trae la lista de vehículos
      targetPayload.FUNC = 'GETLASTDATA'; 
      targetPayload.paramsData = {};
    } 
    else if (endpoint === 'history') {
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
        'Cookie': cookieHeader // <--- AQUÍ ESTÁ LA CLAVE DEL ACCESO
      },
      body: JSON.stringify(targetPayload)
    });

    // Si falla el paso 2, devolvemos el error tal cual para verlo
    if (!dataRes.ok) {
      const errorTxt = await dataRes.text();
      return { statusCode: dataRes.status, body: `Error Data: ${errorTxt}` };
    }

    const json = await dataRes.json();
    
    // Devolvemos el JSON final al frontend
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(json)
    };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};