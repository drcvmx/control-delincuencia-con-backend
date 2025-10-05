const express = require('express');
const router = express.Router();
const personaController = require('../controllers/personaController');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validatePersona, validatePersonaUpdate, validateIdParam, validatePagination } = require('../middleware/validation');

/**
 * @route GET /api/personas
 * @desc Obtener todas las personas con paginación
 * @access Private - Requiere permiso de lectura
 */
router.get('/',
  authenticateToken,
  requirePermission('personas', 'leer'),
  validatePagination,
  personaController.getPersonas
);

/**
 * @route GET /api/personas/search
 * @desc Búsqueda avanzada de personas
 * @access Private - Requiere permiso de lectura
 */
router.get('/search',
  authenticateToken,
  requirePermission('personas', 'leer'),
  personaController.searchPersonas
);

/**
 * @route GET /api/personas/:id
 * @desc Obtener una persona por ID
 * @access Private - Requiere permiso de lectura
 */
router.get('/:id',
  authenticateToken,
  requirePermission('personas', 'leer'),
  validateIdParam,
  personaController.getPersonaById
);

/**
 * @route POST /api/personas
 * @desc Crear nueva persona
 * @access Private - Requiere permiso de creación
 */
router.post('/',
  authenticateToken,
  requirePermission('personas', 'crear'),
  validatePersona,
  personaController.createPersona
);

/**
 * @route PUT /api/personas/:id
 * @desc Actualizar una persona
 * @access Private - Requiere permiso de actualización
 */
router.put('/:id',
  authenticateToken,
  requirePermission('personas', 'actualizar'),
  validateIdParam,
  validatePersonaUpdate,
  personaController.updatePersona
);

/**
 * @route DELETE /api/personas/:id
 * @desc Eliminar una persona (marcar como fallecida)
 * @access Private - Requiere permiso de eliminación
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('personas', 'eliminar'),
  validateIdParam,
  personaController.deletePersona
);

module.exports = router;