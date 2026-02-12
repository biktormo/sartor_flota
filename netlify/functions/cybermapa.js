export const handler = async (event, context) => {
  // Volvemos a la URL que sabemos que existe y responde (main.jss)
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
  
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Headers estándar
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://gps.commers.com.ar/StreetZ/',
    'Origin': 'https://gps.commers.com.ar'
  };

  try {
    // --- PASO 1: LOGIN (INITIALIZE) ---
    console.log("1. Autenticando con INITIALIZE...");
    const loginPayload = {
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

    const loginRes = await fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(loginPayload)
    });

    if (!loginRes.ok) throw new Error(`Login falló: ${loginRes.status}`);

    const loginJson = await loginRes.json();
    
    // AQUÍ ESTÁ LA CLAVE: Capturamos la sesión que nos dio el servidor
    const activeSession = loginJson.session;
    
    if (!activeSession) throw new Error("El servidor no devolvió una sesión válida.");

    // --- PASO 2: PEDIR DATOS CON LA SESIÓN ACTIVA ---
    console.log("2. Pidiendo datos con sesión activa...");
    
    let dataPayload = {
      session: activeSession, // <--- ENVIAMOS LA SESIÓN ACTUALIZADA
      pr: "https:"
    };

    if (endpoint === 'assets') {
      dataPayload.FUNC = 'GETLASTDATA';
      dataPayload.paramsData = {};
    } 
    else if (endpoint === 'history') {
      dataPayload.FUNC = 'GETHISTORY';
      dataPayload.paramsData = {
          elementId: patente, // ID o Patente
          beginDate: from, 
          endDate: to
      };
    }

    const dataRes = await fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(dataPayload)
    });

    if (!dataRes.ok) throw new Error(`Error Datos: ${dataRes.status}`);

    const finalJson = await dataRes.json();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(finalJson)
    };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};