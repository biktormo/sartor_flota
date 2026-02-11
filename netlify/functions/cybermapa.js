// Usamos sintaxis ES Module (export const) para que sea compatible con tu package.json

export const handler = async (event, context) => {
  const API_URL = 'https://gps.commers.com.ar/API/WService.js';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales en Netlify" }) };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Payload base
  let bodyPayload = {
    user: USER,
    pwd: PASS
  };

  // Usamos la acción que nos devolvió el error "Función Desconocida"
  // Si GETVEHICULOS dio error, volvemos a intentar con LISTAUNIDADES.
  if (endpoint === 'assets') {
    bodyPayload.action = 'LISTAUNIDADES'; 
  } 
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    bodyPayload.vehiculo = patente;
    bodyPayload.tipoID = 'patente';
    bodyPayload.desde = from;
    bodyPayload.hasta = to;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: `Error Servidor: ${text}` };
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