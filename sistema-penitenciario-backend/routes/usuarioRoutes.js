const express = require('express');
const router = express.Router();

// Importar controlador
const {
  // Usuarios
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  asignarRol,
  revocarRol,
  
  // Roles
  getRoles,
  createRol,
  
  // Permisos
  getPermisos,
  createPermiso
} = require('../controllers/usuarioController');

// Importar middleware
const { authenticateToken, requirePermission, requireRole } = require('../middleware/auth');
const { 
  validateUsuario, 
  validateUsuarioUpdate, 
  validateRol,
  validatePermiso 
} = require('../middleware/validation');

// ===== RUTAS DE USUARIOS =====

// GET /api/usuarios - Obtener todos los usuarios (solo administradores)
router.get('/', 
  authenticateToken,
  requirePermission('usuarios', 'leer'),
  getUsuarios
);

// GET /api/usuarios/:id - Obtener un usuario por ID
router.get('/:id', 
  authenticateToken,
  requirePermission('usuarios', 'leer'),
  getUsuarioById
);

// POST /api/usuarios - Crear nuevo usuario (solo administradores)
router.post('/', 
  authenticateToken,
  requireRole('administrador'),
  validateUsuario,
  createUsuario
);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', 
  authenticateToken,
  requirePermission('usuarios', 'actualizar'),
  validateUsuarioUpdate,
  updateUsuario
);

// DELETE /api/usuarios/:id - Eliminar usuario (solo administradores)
router.delete('/:id', 
  authenticateToken,
  requireRole('administrador'),
  deleteUsuario
);

// ===== RUTAS DE ASIGNACIÓN DE ROLES =====

// POST /api/usuarios/:id/roles - Asignar rol a usuario
router.post('/:id/roles', 
  authenticateToken,
  requireRole('administrador'),
  asignarRol
);

// DELETE /api/usuarios/:id/roles/:rol_id - Revocar rol de usuario
router.delete('/:id/roles/:rol_id', 
  authenticateToken,
  requireRole('administrador'),
  revocarRol
);

// ===== RUTAS DE ROLES =====

// GET /api/usuarios/roles/all - Obtener todos los roles
router.get('/roles/all', 
  authenticateToken,
  requirePermission('roles', 'leer'),
  getRoles
);

// POST /api/usuarios/roles - Crear nuevo rol (solo administradores)
router.post('/roles', 
  authenticateToken,
  requireRole('administrador'),
  validateRol,
  createRol
);

// ===== RUTAS DE PERMISOS =====

// GET /api/usuarios/permisos/all - Obtener todos los permisos
router.get('/permisos/all', 
  authenticateToken,
  requirePermission('permisos', 'leer'),
  getPermisos
);

// POST /api/usuarios/permisos - Crear nuevo permiso (solo administradores)
router.post('/permisos', 
  authenticateToken,
  requireRole('administrador'),
  validatePermiso,
  createPermiso
);

module.exports = router;