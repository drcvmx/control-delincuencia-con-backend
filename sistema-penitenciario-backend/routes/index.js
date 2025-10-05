const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./authRoutes');
const personaRoutes = require('./personaRoutes');
const delincuenteRoutes = require('./delincuenteRoutes');
const crimenRoutes = require('./crimenRoutes');
const carcelRoutes = require('./carcelRoutes');
const estatusRoutes = require('./estatusRoutes');
const usuarioRoutes = require('./usuarioRoutes');

// Importar middleware de validación común
const { validatePagination } = require('../middleware/validation');

// ===== RUTAS DE AUTENTICACIÓN =====
router.use('/auth', authRoutes);

// ===== RUTAS DE ENTIDADES PRINCIPALES =====

// Personas
router.use('/personas', personaRoutes);

// Delincuentes
router.use('/delincuentes', delincuenteRoutes);

// Crímenes
router.use('/crimenes', crimenRoutes);

// Cárceles
router.use('/carceles', carcelRoutes);

// Estatus penitenciario
router.use('/estatus', estatusRoutes);

// ===== RUTAS DE ADMINISTRACIÓN =====

// Usuarios, roles y permisos
router.use('/usuarios', usuarioRoutes);

// ===== RUTAS ADICIONALES =====

// Ruta de información de la API
router.get('/info', (req, res) => {
  res.json({
    name: 'Sistema Penitenciario API',
    version: '1.0.0',
    description: 'API REST para gestión del sistema penitenciario',
    endpoints: {
      auth: '/api/auth',
      personas: '/api/personas',
      delincuentes: '/api/delincuentes',
      crimenes: '/api/crimenes',
      carceles: '/api/carceles',
      estatus: '/api/estatus',
      usuarios: '/api/usuarios'
    },
    documentation: {
      health: '/health',
      info: '/api/info'
    }
  });
});

// Middleware para rutas no encontradas dentro de /api
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    message: 'La ruta solicitada no existe en esta API',
    availableEndpoints: [
      '/api/auth',
      '/api/personas',
      '/api/delincuentes',
      '/api/crimenes',
      '/api/carceles',
      '/api/estatus',
      '/api/usuarios',
      '/api/info'
    ]
  });
});

module.exports = router;