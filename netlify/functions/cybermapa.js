// netlify/functions/cybermapa.js

export const handler = async (event, context) => {
  // 1. URL DE LA API (WService.js)
  const API_URL = 'https://gps.commers.com.ar/API/WService.js';

  // 2. CREDENCIALES DESDE NETLIFY
  const USER = process.env.CYBERMAPA_USER;
  const PASS = process.env.CYBERMAPA_PASS;

  if (!USER || !PASS) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Faltan credenciales en Netlify Environment Variables" })
    };
  }

  // 3. OBTENER PARÁMETROS DEL FRONTEND
  const { endpoint, from, to, patente } = event.queryStringParameters;

  // 4. CONSTRUIR EL PAYLOAD BASE (Autenticación)
  let bodyPayload = {
    user: USER,
    pwd: PASS
  };

  // 5. SELECCIONAR LA ACCIÓN SEGÚN EL ENDPOINT
  if (endpoint === 'assets') {
    // Acción para obtener la lista de flota
    // Según tu captura exitosa, esto devuelve { unidades: [...] }
    bodyPayload.action = 'GETVEHICULOS';
  } 
  else if (endpoint === 'history') {
    // Acción para obtener el recorrido histórico
    bodyPayload.action = 'DATOSHISTORICOS';
    
    // Parámetros específicos del historial
    bodyPayload.vehiculo = patente; // Aquí llegará el ID (ej: 8652...)
    bodyPayload.tipoID = 'gps';     // Indicamos que estamos enviando el ID interno del GPS
    bodyPayload.desde = from;       // Formato YYYY-MM-DD HH:MM:SS
    bodyPayload.hasta = to;
    
    // Opcional: Pedir campos específicos si la API lo soporta
    // bodyPayload.output = ['lat', 'lon', 'velocidad', 'odometro', 'evento']; 
  }

  try {
    // 6. HACER LA PETICIÓN AL SERVIDOR DE COMMERS
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(bodyPayload)
    });

    // Manejo de errores del servidor externo
    if (!response.ok) {
      const text = await response.text();
      return { 
        statusCode: response.status, 
        body: `Error Servidor GPS: ${text}` 
      };
    }

    // 7. PROCESAR RESPUESTA
    const data = await response.json();

    // Verificación extra: A veces devuelven 200 OK pero con un error lógico en el JSON
    if (data.status === 'rechazado' || data.error) {
        return {
            statusCode: 400,
            body: JSON.stringify(data)
        };
    }

    // 8. DEVOLVER AL FRONTEND
    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*", 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Error en función Netlify:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.toString() }) 
    };
  }
};