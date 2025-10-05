const express = require('express');
const router = express.Router();

// Importar controlador
const {
  getCrimenes,
  getCrimenById,
  createCrimen,
  updateCrimen,
  deleteCrimen,
  asociarDelincuente,
  desasociarDelincuente,
  searchCrimenes,
  getEstadisticas
} = require('../controllers/crimenController');

// Importar middleware
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateCrimen, validateCrimenUpdate } = require('../middleware/validation');

// ===== RUTAS DE CONSULTA =====

// GET /api/crimenes - Obtener todos los crímenes con paginación
router.get('/', 
  authenticateToken,
  requirePermission('crimenes', 'leer'),
  getCrimenes
);

// GET /api/crimenes/search - Búsqueda avanzada de crímenes
router.get('/search', 
  authenticateToken,
  requirePermission('crimenes', 'leer'),
  searchCrimenes
);

// GET /api/crimenes/estadisticas - Obtener estadísticas de crímenes
router.get('/estadisticas', 
  authenticateToken,
  requirePermission('crimenes', 'leer'),
  getEstadisticas
);

// GET /api/crimenes/:id - Obtener un crimen por ID
router.get('/:id', 
  authenticateToken,
  requirePermission('crimenes', 'leer'),
  getCrimenById
);

// ===== RUTAS DE MODIFICACIÓN =====

// POST /api/crimenes - Crear nuevo crimen
router.post('/', 
  authenticateToken,
  requirePermission('crimenes', 'crear'),
  validateCrimen,
  createCrimen
);

// PUT /api/crimenes/:id - Actualizar crimen
router.put('/:id', 
  authenticateToken,
  requirePermission('crimenes', 'actualizar'),
  validateCrimenUpdate,
  updateCrimen
);

// DELETE /api/crimenes/:id - Eliminar crimen
router.delete('/:id', 
  authenticateToken,
  requirePermission('crimenes', 'eliminar'),
  deleteCrimen
);

// ===== RUTAS PARA ASOCIACIONES CON DELINCUENTES =====

// POST /api/crimenes/:id/delincuentes - Asociar crimen con delincuente
router.post('/:id/delincuentes', 
  authenticateToken,
  requirePermission('crimenes', 'actualizar'),
  asociarDelincuente
);

// DELETE /api/crimenes/:id/delincuentes/:delincuente_id - Desasociar crimen de delincuente
router.delete('/:id/delincuentes/:delincuente_id', 
  authenticateToken,
  requirePermission('crimenes', 'actualizar'),
  desasociarDelincuente
);

module.exports = router;