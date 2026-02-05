export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // --- NUEVA ESTRUCTURA DEL PAYLOAD (IMITANDO LA CAPTURA) ---
  let bodyPayload = {
    FUNC: "", // Lo llenaremos abajo
    session: {
      user: USER,
      pwd: PASS,
      // Estos son valores fijos que vimos en la captura, los replicamos
      lang: "es",
      production: 1,
      temporalInvitationModeEnabled: 0,
      trackerModeEnabled: 0
    }
  };

  // Asumimos que para listar vehículos se usa una FUNC específica (ej: 'GETUNITS')
  // Como no la sabemos, tendremos que adivinar o encontrarla. Probemos con la estándar.
  if (endpoint === 'assets') {
    // La documentación antigua usaba 'DATOSACTUALES', pero este sistema parece diferente.
    // Probaremos con 'GETLASTDATA' o 'GETUNITS' que son comunes.
    // Si esto falla, aquí es donde necesitamos espiar otra vez para ver qué FUNC usa.
    bodyPayload.FUNC = 'INITIALIZE'; 
    bodyPayload.paramsData = {};
  } 
  
  // Para historial, la FUNC será algo como 'GETHISTORY'
  else if (endpoint === 'history') {
    bodyPayload.FUNC = 'GETHISTORY';
    bodyPayload.paramsData = {
      // Ajustar nombres de parámetros según lo que espere el servidor
      id: patente,
      beginDate: from, // formato YYYY-MM-DD HH:mm:ss
      endDate: to,
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
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