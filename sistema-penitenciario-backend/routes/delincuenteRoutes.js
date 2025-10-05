const express = require('express');
const router = express.Router();

// Importar controlador
const {
  getDelincuentes,
  getDelincuenteById,
  createDelincuente,
  updateDelincuente,
  deleteDelincuente,
  asociarCrimen,
  desasociarCrimen,
  searchDelincuentes,
  getEstadisticas
} = require('../controllers/delincuenteController');

// Importar middleware
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateDelincuente, validateDelincuenteUpdate } = require('../middleware/validation');

// ===== RUTAS PÚBLICAS (requieren autenticación básica) =====

// GET /api/delincuentes - Obtener todos los delincuentes con paginación
router.get('/', 
  authenticateToken,
  requirePermission('delincuentes', 'leer'),
  getDelincuentes
);

// GET /api/delincuentes/search - Búsqueda avanzada de delincuentes
router.get('/search', 
  authenticateToken,
  requirePermission('delincuentes', 'leer'),
  searchDelincuentes
);

// GET /api/delincuentes/estadisticas - Obtener estadísticas de delincuentes
router.get('/estadisticas', 
  authenticateToken,
  requirePermission('delincuentes', 'leer'),
  getEstadisticas
);

// GET /api/delincuentes/:id - Obtener un delincuente por ID
router.get('/:id', 
  authenticateToken,
  requirePermission('delincuentes', 'leer'),
  getDelincuenteById
);

// ===== RUTAS PROTEGIDAS (requieren permisos específicos) =====

// POST /api/delincuentes - Crear nuevo delincuente
router.post('/', 
  authenticateToken, // Habilitado nuevamente
  requirePermission('delincuentes', 'crear'), // Habilitado nuevamente
  validateDelincuente,
  createDelincuente
);

// PUT /api/delincuentes/:id - Actualizar delincuente
router.put('/:id', 
  authenticateToken,
  requirePermission('delincuentes', 'actualizar'),
  validateDelincuenteUpdate,
  updateDelincuente
);

// DELETE /api/delincuentes/:id - Eliminar delincuente
router.delete('/:id', 
  authenticateToken,
  requirePermission('delincuentes', 'eliminar'),
  deleteDelincuente
);

// ===== RUTAS PARA ASOCIACIONES CON CRÍMENES =====

// POST /api/delincuentes/:id/crimenes - Asociar delincuente con crimen
router.post('/:id/crimenes', 
  authenticateToken,
  requirePermission('delincuentes', 'actualizar'),
  asociarCrimen
);

// DELETE /api/delincuentes/:id/crimenes/:crimen_id - Desasociar delincuente de crimen
router.delete('/:id/crimenes/:crimen_id', 
  authenticateToken,
  requirePermission('delincuentes', 'actualizar'),
  desasociarCrimen
);

module.exports = router;