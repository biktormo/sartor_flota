export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) return { statusCode: 500, body: "Faltan credenciales" };

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // --- ESTRUCTURA IDÉNTICA A TU CAPTURA DE PANTALLA ---
  let bodyPayload = {
    FUNC: "INITIALIZE", // Volvemos a probar con INITIALIZE para romper el 403
    paramsData: { 
        auditReEntry: true 
    },
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

  // Si logramos conectar con INITIALIZE, luego nos preocupamos por GETHISTORY
  if (endpoint === 'history') {
    bodyPayload.FUNC = 'GETHISTORY';
    bodyPayload.paramsData = {
        id: patente,
        beginDate: from, 
        endDate: to
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Referer': 'https://gps.commers.com.ar/StreetZ/',
        'Origin': 'https://gps.commers.com.ar',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(bodyPayload)
    });

    // Si sigue dando 403, mostramos el cuerpo para ver si dice algo útil
    if (!response.ok) {
      const text = await response.text();
      console.log("Error 403 Body:", text);
      return { statusCode: response.status, body: `Bloqueo Commers: ${text}` };
    }

    const data = await response.json();
    console.log("LOGIN EXITOSO:", data);

    // --- PARCHE ---
    // Si pedimos 'assets', pero usamos INITIALIZE, la lista de autos
    // estará muy escondida. La buscamos y la devolvemos limpia.
    let finalData = data;
    
    if (endpoint === 'assets') {
        // En INITIALIZE la flota suele venir en data.units o data.view.units
        const units = data.data?.units || data.data?.view?.units || [];
        // Devolvemos solo lo que le interesa al frontend
        finalData = units; 
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(finalData)
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};