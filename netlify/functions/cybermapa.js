export const handler = async (event, context) => {
    // --- CAMBIO AQUÍ: URL ESPECÍFICA DE COMMERS ---
    // Basado en tu link, la API suele estar en la carpeta /json/
    const API_URL = 'https://api.cybermapa.com/v1/json/'; 
  
    const USER = process.env.CYBERMAPA_USER;
    const PASS = process.env.CYBERMAPA_PASS;
  
    // Validación rápida de credenciales
    if (!USER || !PASS) {
      return { statusCode: 500, body: JSON.stringify({ error: "Faltan credenciales en Netlify" }) };
    }
  
    const { endpoint, from, to, patente } = event.queryStringParameters;
  
    let bodyPayload = {
      user: USER,
      pwd: PASS,
      output: 'json'
    };
  
    // Configurar acción según endpoint
    if (endpoint === 'assets') {
      bodyPayload.action = 'DATOSACTUALES';
    } else if (endpoint === 'history') {
      bodyPayload.action = 'DATOSHISTORICOS';
      bodyPayload.vehiculo = patente;
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
        return { statusCode: response.status, body: `Error Servidor GPS: ${response.statusText}` };
      }
  
      const data = await response.json();
  
      // Manejo de errores lógicos de la API (Login fallido, etc)
      if (data.result === 'error' || data.error) {
         console.error("Error API GPS:", data);
         return { statusCode: 400, body: JSON.stringify(data) };
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