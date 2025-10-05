const express = require('express');
const router = express.Router();

// Importar controlador
const {
  getEstatusPronitenciarios,
  getEstatusByDelincuente,
  createEstatus,
  updateEstatus,
  liberarDelincuente,
  getEstadisticas
} = require('../controllers/estatusController');

// Importar middleware
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateEstatus, validateEstatusUpdate } = require('../middleware/validation');

// ===== RUTAS DE CONSULTA =====

// GET /api/estatus - Obtener todos los estatus penitenciarios con paginación
router.get('/', 
  authenticateToken,
  requirePermission('estatus_penitenciario', 'leer'),
  getEstatusPronitenciarios
);

// GET /api/estatus/estadisticas - Obtener estadísticas de estatus penitenciarios
router.get('/estadisticas', 
  authenticateToken,
  requirePermission('estatus_penitenciario', 'leer'),
  getEstadisticas
);

// GET /api/estatus/delincuente/:delincuente_id - Obtener estatus por delincuente
router.get('/delincuente/:delincuente_id', 
  authenticateToken,
  requirePermission('estatus_penitenciario', 'leer'),     
  getEstatusByDelincuente
);

// ===== RUTAS DE MODIFICACIÓN =====

// POST /api/estatus - Crear nuevo estatus penitenciario (ingreso a prisión)
router.post('/', 
  authenticateToken, // Habilitado nuevamente
  requirePermission('estatus_penitenciario', 'crear'), // Habilitado nuevamente
  validateEstatus,
  createEstatus
);

// PUT /api/estatus/:delincuente_id - Actualizar estatus penitenciario activo
router.put('/:delincuente_id', 
  authenticateToken,
  requirePermission('estatus_penitenciario', 'actualizar'),
  validateEstatusUpdate,
  updateEstatus
);

// POST /api/estatus/:delincuente_id/liberar - Liberar delincuente (marcar fecha de salida)
router.post('/:delincuente_id/liberar', 
  authenticateToken,
  requirePermission('estatus_penitenciario', 'leer'),
  requirePermission('estatus_penitenciario', 'leer'),
  requirePermission('estatus_penitenciario', 'crear'),
  requirePermission('estatus_penitenciario', 'actualizar'),
  requirePermission('estatus_penitenciario', 'actualizar'),
  liberarDelincuente
);

module.exports = router;