export const handler = async (event, context) => {
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;
  
  let targetUrl = '';
  let bodyPayload = {};

  // --- 1. OBTENER VEHÍCULOS (Estrategia: main.jss / INITIALIZE) ---
  // Esto ya comprobamos que te funciona y trae la lista.
  if (endpoint === 'assets') {
    targetUrl = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
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
  } 
  
  // --- 2. OBTENER HISTORIAL (Estrategia: WService.js / API Documentada) ---
  else if (endpoint === 'history') {
    targetUrl = 'https://gps.commers.com.ar/API/WService.js';
    
    // Payload LIMPIO según la documentación que enviaste
    bodyPayload = {
      action: "DATOSHISTORICOS",
      user: USER,
      pwd: PASS,
      vehiculo: patente, // Aquí enviaremos el ID NUMÉRICO (ej: 8652...)
      tipoID: "gps",     // Documentación: "Si no se especifica... tomará identificador de GPS"
      desde: from,
      hasta: to
    };
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
        // No enviamos cookies ni referer para WService, es una API pura.
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: `Error API: ${text}` };
    }

    const data = await response.json();

    // --- LIMPIEZA DE RESPUESTA PARA EL FRONTEND ---
    let finalResponse = data;

    // Si es assets (INITIALIZE), extraemos solo la lista de loginPositions
    if (endpoint === 'assets') {
        if (data.loginPositions) {
            finalResponse = { unidades: data.loginPositions };
        }
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(finalResponse)
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};