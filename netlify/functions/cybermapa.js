export const handler = async (event, context) => {
  // Según la documentación de Cybermapa, el endpoint suele ser este para instalaciones dedicadas.
  // Si falla, probaremos quitando "/StreetZ"
  const API_URL = 'https://gps.commers.com.ar/StreetZ/json/';

  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales" }) };
  }

  const { endpoint, from, to, patente } = event.queryStringParameters;

  // Estructura base según la documentación oficial
  let bodyPayload = {
    user: USER,
    pwd: PASS,
    // La doc dice que 'output' es opcional, pero ayuda pedir JSON explícito si el servidor lo soporta
    // No agregamos 'output' aquí para respetar estrictamente los obligatorios primero
  };

  // 1. Obtener Lista de Vehículos
  if (endpoint === 'assets') {
    // Usamos GETVEHICULOS como indica la doc para "Listado Vehiculos"
    bodyPayload.action = 'GETVEHICULOS';
  } 
  // 2. Obtener Historial
  else if (endpoint === 'history') {
    bodyPayload.action = 'DATOSHISTORICOS';
    bodyPayload.vehiculo = patente; // Identificador (puede requerir tipoID)
    bodyPayload.tipoID = 'patente'; // Forzamos búsqueda por patente que es lo que tenemos
    bodyPayload.desde = from;
    bodyPayload.hasta = to;
    // output opcional: pedir solo distancia si fuera posible, si no, trae todo
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      return { statusCode: response.status, body: `Error HTTP: ${response.statusText}` };
    }

    // A veces la API devuelve texto que parece JSON pero tiene errores, lo manejamos seguro
    const textData = await response.text();
    let data;
    try {
        data = JSON.parse(textData);
    } catch (e) {
        return { statusCode: 500, body: `Error parseando JSON: ${textData.substring(0, 100)}...` };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.toString() }) };
  }
};