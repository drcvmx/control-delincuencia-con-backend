const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting para endpoints de autenticación
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP cada 15 minutos
  message: {
    error: 'Demasiados intentos de autenticación',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP cada 15 minutos
  message: {
    error: 'Demasiadas solicitudes',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario
 * @access Public
 */
router.post('/register', 
  authRateLimit,
  validateRegister,
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', 
  authRateLimit,
  validateLogin,
  authController.login
);

/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', 
  generalRateLimit,
  authenticateToken,
  authController.logout
);

/**
 * @route POST /api/auth/refresh
 * @desc Renovar token de acceso
 * @access Private
 */
router.post('/refresh', 
  generalRateLimit,
  authController.refresh
);

/**
 * @route GET /api/auth/profile
 * @desc Obtener perfil del usuario actual
 * @access Private
 */
router.get('/profile', 
  generalRateLimit,
  authenticateToken,
  authController.getProfile
);

/**
 * @route PUT /api/auth/change-password
 * @desc Cambiar contraseña del usuario actual
 * @access Private
 */
router.put('/change-password', 
  authRateLimit,
  authenticateToken,
  // Necesitamos crear validateChangePassword en validation.js
  authController.changePassword
);

/**
 * @route POST /api/auth/invalidate-sessions
 * @desc Invalidar todas las sesiones del usuario
 * @access Private
 */
router.post('/invalidate-sessions', 
  generalRateLimit,
  authenticateToken,
  authController.invalidateAllSessions
);

module.exports = router;