export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // --- CONFIGURACIÓN COMÚN ---
  const commonHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
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

  // --- 1. PRIMER SALTO: INITIALIZE (PARA OBTENER COOKIE) ---
  // Siempre hacemos esto primero para "abrir la puerta"
  let cookie = null;
  try {
    const initPayload = {
      FUNC: "INITIALIZE",
      paramsData: { auditReEntry: true },
      pr: "https:",
      session: sessionData
    };

    const loginRes = await fetch(API_URL, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(initPayload)
    });

    if (!loginRes.ok) throw new Error("Fallo en login INITIALIZE");
    
    // ATENCIÓN: Capturamos la cookie de sesión
    cookie = loginRes.headers.get('set-cookie');
    
    // Si endpoint es 'assets', aprovechamos para ver si INITIALIZE ya trajo datos
    // (A veces loginPositions tiene lo que buscamos y ahorramos el segundo paso)
    // Pero por seguridad, haremos el segundo paso si el usuario quiere la lista completa.
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error en Login: " + e.message }) };
  }

  // --- 2. SEGUNDO SALTO: PEDIR LOS DATOS REALES ---
  
  let targetPayload = {
    session: sessionData, // Enviamos sesión de nuevo por si acaso
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

  try {
    const dataRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        'Cookie': cookie // <--- ¡AQUÍ ESTÁ LA MAGIA! Pasamos la cookie
      },
      body: JSON.stringify(targetPayload)
    });

    if (!dataRes.ok) {
       // Si falla, devolvemos el error 403/500 original
       const txt = await dataRes.text();
       return { statusCode: dataRes.status, body: `Error Data (${dataRes.status}): ${txt}` };
    }

    const json = await dataRes.json();
    
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(json)
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};