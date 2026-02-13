export const handler = async (event, context) => {
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  let targetUrl = '';
  let bodyPayload = {};
  let headers = {
    'Content-Type': 'application/json'
  };

  // 1. LISTA DE VEHÍCULOS (Estrategia: main.jss / INITIALIZE)
  // Usamos esta porque ya confirmamos que te devuelve el array 'loginPositions'
  if (endpoint === 'assets') {
    targetUrl = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
    
    // Headers necesarios para main.jss
    headers['Referer'] = 'https://gps.commers.com.ar/StreetZ/';
    headers['Origin'] = 'https://gps.commers.com.ar';
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
  
  // 2. HISTORIAL (Estrategia: WService.js / DATOSHISTORICOS)
  // Ajustado estrictamente a tu imagen de documentación
  else if (endpoint === 'history') {
    targetUrl = 'https://gps.commers.com.ar/API/WService.js';
    
    bodyPayload = {
      action: "DATOSHISTORICOS",
      user: USER,
      pwd: PASS,
      vehiculo: patente, // Enviaremos el ID numérico (gps)
      tipoID: "gps",     // Especificamos que enviamos el ID de GPS
      desde: from,
      hasta: to
      // numpag: 1 (Podríamos paginar en el futuro, por ahora pedimos la 1)
    };
  }

  try {
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

    // Limpieza para el frontend
    let finalResponse = data;

    // Si es assets (INITIALIZE), extraemos solo la lista
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