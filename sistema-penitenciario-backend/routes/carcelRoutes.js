const express = require('express');
const router = express.Router();

// Importar controlador
const {
  getCarceles,
  getCarcelById,
  createCarcel,
  updateCarcel,
  deleteCarcel,
  getEstadisticas
} = require('../controllers/carcelController');

// Importar middleware
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateCarcel, validateCarcelUpdate } = require('../middleware/validation');

// ===== RUTAS DE CONSULTA =====

// GET /api/carceles - Obtener todas las cárceles con paginación
router.get('/', 
  authenticateToken,
  requirePermission('carceles', 'leer'),
  getCarceles
);

// GET /api/carceles/estadisticas - Obtener estadísticas de cárceles
router.get('/estadisticas', 
  authenticateToken,
  requirePermission('carceles', 'leer'),
  getEstadisticas
);

// GET /api/carceles/:id - Obtener una cárcel por ID con información completa
router.get('/:id', 
  authenticateToken,
  requirePermission('carceles', 'leer'),
  getCarcelById
);

// ===== RUTAS DE MODIFICACIÓN =====

// POST /api/carceles - Crear nueva cárcel
router.post('/', 
  authenticateToken,
  requirePermission('carceles', 'crear'),
  validateCarcel,
  createCarcel
);

// PUT /api/carceles/:id - Actualizar cárcel
router.put('/:id', 
  authenticateToken,
  requirePermission('carceles', 'actualizar'),
  validateCarcelUpdate,
  updateCarcel
);

// DELETE /api/carceles/:id - Eliminar cárcel
router.delete('/:id', 
  authenticateToken,
  requirePermission('carceles', 'eliminar'),      
  deleteCarcel
);

module.exports = router;