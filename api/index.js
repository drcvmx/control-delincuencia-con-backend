// api/index.js
const app = require('../sistema-penitenciario-backend/app.js');
const { Readable } = require('stream');

// Handler para Vercel serverless
module.exports = async (req, res) => {
  try {
    // Vercel agrega ?path= a la URL, necesitamos reconstruir la ruta correcta
    const path = req.query.path || '';
    
    // Reconstruir la URL original sin el parámetro path
    req.url = `/api/${path}`;
    
    // Eliminar el parámetro path del query
    delete req.query.path;
    
    // Si es POST, PUT o PATCH, necesitamos recrear el stream del body
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      // Leer el body como texto
      let bodyText = '';
      
      // Intentar leer chunks si están disponibles
      for await (const chunk of req) {
        bodyText += chunk;
      }
      
      // Si no hay body, intentar obtenerlo de otra forma
      if (!bodyText && req.body) {
        bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
      
      // Crear un nuevo stream readable con el body
      const bodyStream = new Readable();
      bodyStream.push(bodyText);
      bodyStream.push(null);
      
      // Reemplazar el request original con uno que tenga el stream nuevo
      Object.assign(req, bodyStream);
      req.headers['content-length'] = Buffer.byteLength(bodyText).toString();
    }
    
    // Pasar la request a Express
    return app(req, res);
  } catch (error) {
    console.error('Error en API handler:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Configuración para deshabilitar body parser de Next.js
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
