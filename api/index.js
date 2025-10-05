    // api/index.js

// Importa tu app Express desde su ubicación
const app = require('../sistema-penitenciario-backend/app.js'); // <-- ¡Aquí está la corrección!

// Exporta la app para que Vercel la convierta en una serverless function
module.exports = app;