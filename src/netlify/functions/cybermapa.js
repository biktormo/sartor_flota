export const handler = async (event, context) => {
    // URLs base según documentación (ajustar si Commers usa un dominio distinto)
    // Generalmente es: https://api.cybermapa.com/v1/json/
    // Si Commers tiene su propia URL de API, reemplázala aquí.
    const API_URL = 'https://api.cybermapa.com/v1/json/'; 
  
    const USER = process.env.CYBERMAPA_USER;
    const PASS = process.env.CYBERMAPA_PASS;
  
    // Obtenemos qué quiere el frontend (assets o history)
    const { endpoint, from, to, patente } = event.queryStringParameters;
  
    // Configuramos el cuerpo del mensaje según la documentación
    let bodyPayload = {
      user: USER,
      pwd: PASS,
      output: 'json' // Pedimos JSON explícitamente
    };
  
    // 1. Caso: Listar Vehículos (DATOSACTUALES)
    if (endpoint === 'assets') {
      bodyPayload.action = 'DATOSACTUALES';
    } 
    
    // 2. Caso: Historial de un vehículo (DATOSHISTORICOS)
    else if (endpoint === 'history') {
      bodyPayload.action = 'DATOSHISTORICOS';
      bodyPayload.vehiculo = patente; // Cybermapa pide Patente o ID
      bodyPayload.desde = from;       // Formato: YYYY-MM-DD HH:MM:SS
      bodyPayload.hasta = to;
    }
  
    try {
      const response = await fetch(API_URL, {
        method: 'POST', // Siempre POST
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });
  
      if (!response.ok) {
        return { statusCode: response.status, body: `Error API: ${response.statusText}` };
      }
  
      const data = await response.json();
  
      // Verificamos si Cybermapa devolvió un error lógico (ej: "Usuario incorrecto")
      if (data.error || data.result === 'error') {
         return { statusCode: 400, body: JSON.stringify(data) };
      }
  
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify(data)
      };
  
    } catch (error) {
      return { statusCode: 500, body: error.toString() };
    }
  };