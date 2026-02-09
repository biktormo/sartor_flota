// Usamos sintaxis ES Module (export const) para compatibilidad con tu package.json

export const handler = async (event, context) => {
  // URL descubierta en tu inspección de red
  const API_URL = 'https://gps.commers.com.ar/StreetZ/server/scripts/main/main.jss';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Faltan credenciales en Netlify" }) 
    };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Estructura del payload basada en tu captura de red
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

  // 1. Listado de Vehículos
  if (endpoint === 'assets') {
    // Usamos GETLASTDATA que es la función estándar en este tipo de backend (main.jss)
    // para traer la lista de móviles.
    bodyPayload.FUNC = 'GETLASTDATA'; 
    bodyPayload.paramsData = {};
  } 
  // 2. Historial
  else if (endpoint === 'history') {
    bodyPayload.FUNC = 'GETHISTORY'; // Nombre estándar para historial
    bodyPayload.paramsData = {
      // Ajustamos los parámetros. En main.jss suelen pedir IDs internos,
      // pero probemos enviando la patente o ID que tengamos.
      elementId: patente, // A veces es 'uID', 'id', 'elementId'
      beginDate: from, 
      endDate: to,
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Importante: Fingir ser el navegador
        'Referer': 'https://gps.commers.com.ar/StreetZ/'
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