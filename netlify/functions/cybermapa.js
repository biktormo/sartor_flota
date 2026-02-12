export const handler = async (event, context) => {
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;
  let targetUrl = '';
  let bodyPayload = {};

  // --- ESCENARIO 1: LISTA DE VEHÍCULOS (Lo que ya funcionó) ---
  if (endpoint === 'assets') {
    // Usamos el script interno que sabemos que responde bien con tus credenciales
    targetUrl = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
    
    bodyPayload = {
      FUNC: "INITIALIZE",
      paramsData: { auditReEntry: true },
      pr: "https:",
      session: {
        user: USER,
        pwd: PASS,
        lang: "es",
        production: 1
      }
    };
  } 
  
  // --- ESCENARIO 2: HISTORIAL (Según documentación oficial) ---
  else if (endpoint === 'history') {
    // Apuntamos al endpoint API estándar de Cybermapa/StreetZ
    targetUrl = 'https://gps.commers.com.ar/StreetZ/json/';
    
    bodyPayload = {
      action: "DATOSHISTORICOS",
      user: USER,
      pwd: PASS,
      vehiculo: patente, // Enviaremos el ID numérico (gps)
      tipoID: "gps",     // Especificamos que enviamos el ID interno
      desde: from,       // YYYY-MM-DD HH:MM:SS
      hasta: to
    };
  }

  try {
    // Headers universales para evitar bloqueos
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://gps.commers.com.ar/StreetZ/',
      'Origin': 'https://gps.commers.com.ar'
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: `Error Servidor: ${text}` };
    }

    const data = await response.json();

    // --- LIMPIEZA DE RESPUESTA PARA EL FRONTEND ---
    let finalResponse = data;

    // Si es assets (INITIALIZE), extraemos solo la lista que nos interesa
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