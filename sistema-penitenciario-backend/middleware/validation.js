const Joi = require('joi');

// Función helper para manejar errores de validación
const handleValidationError = (error) => {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context.value
  }));
  
  return {
    error: 'Error de validación',
    code: 'VALIDATION_ERROR',
    details: errors
  };
};

// Función helper para crear middleware de validación
const createValidationMiddleware = (schema, target = 'body') => {
  return (req, res, next) => {
    
    const { error } = schema.validate(req[target], { abortEarly: false });
    
    if (error) {
      return res.status(400).json(handleValidationError(error));
    }
    
    next();
  };
};

// ===== ESQUEMAS DE VALIDACIÓN PARA PERSONAS =====

const personaSchema = Joi.object({
  nombre: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 50 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  apellido_paterno: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El apellido paterno debe tener al menos 2 caracteres',
    'string.max': 'El apellido paterno no puede exceder 50 caracteres',
    'any.required': 'El apellido paterno es requerido'
  }),
  apellido_materno: Joi.string().min(2).max(50).optional().allow('').messages({
    'string.min': 'El apellido materno debe tener al menos 2 caracteres',
    'string.max': 'El apellido materno no puede exceder 50 caracteres'
  }),
  fecha_de_nacimiento: Joi.date().max('now').required().messages({
    'date.max': 'La fecha de nacimiento no puede ser futura',
    'any.required': 'La fecha de nacimiento es requerida'
  }),
  fecha_de_fin: Joi.date().min(Joi.ref('fecha_de_nacimiento')).optional().allow('', null).messages({
    'date.min': 'La fecha de fallecimiento no puede ser anterior a la fecha de nacimiento',
    'date.base': 'La fecha de fallecimiento debe ser una fecha válida'
  })
});

const personaUpdateSchema = Joi.object({
  nombre: Joi.string().min(2).max(50).optional().allow(''),
  apellido_paterno: Joi.string().min(2).max(50).optional().allow(''),
  apellido_materno: Joi.string().min(2).max(50).optional().allow(''),
  fecha_de_nacimiento: Joi.date().max('now').optional().allow(''),
  fecha_de_fin: Joi.date().optional().allow('', null)
}).min(1);

// ===== ESQUEMAS DE VALIDACIÓN PARA DELINCUENTES =====

const delincuenteSchema = Joi.object({
  id_persona: Joi.number().integer().positive().required().messages({
    'number.positive': 'El ID de persona debe ser un número positivo',
    'any.required': 'El ID de persona es requerido'
  }),
  fecha_alta_delincuente: Joi.date().max('now').required().messages({
    'date.max': 'La fecha de alta no puede ser futura',
    'any.required': 'La fecha de alta es requerida'
  }),
  alias: Joi.string().max(50).optional().allow('', null),
  antecedentes: Joi.string().optional().allow('', null),
  fecha_detencion: Joi.date().max('now').optional().allow(null),
  lugar_detencion: Joi.string().max(100).optional().allow('', null)
});

const delincuenteUpdateSchema = Joi.object({
  fecha_alta_delincuente: Joi.date().max('now').optional(),
  alias: Joi.string().max(50).optional().allow('', null),
  antecedentes: Joi.string().optional().allow('', null),
  fecha_detencion: Joi.date().max('now').optional().allow(null),
  lugar_detencion: Joi.string().max(100).optional().allow('', null)
}).min(1);

// ===== ESQUEMAS DE VALIDACIÓN PARA CRÍMENES =====

const crimenSchema = Joi.object({
  descripcion: Joi.string().min(10).max(200).required().messages({
    'string.min': 'La descripción debe tener al menos 10 caracteres',
    'string.max': 'La descripción no puede exceder 200 caracteres',
    'any.required': 'La descripción es requerida'
  }),
  fecha_ocurrencia: Joi.date().max('now').required().messages({
    'date.max': 'La fecha de ocurrencia no puede ser futura',
    'any.required': 'La fecha de ocurrencia es requerida'
  }),
  ubicacion: Joi.string().max(100).optional().allow('', null)
});

const crimenUpdateSchema = Joi.object({
  descripcion: Joi.string().min(10).max(200).optional(),
  fecha_ocurrencia: Joi.date().max('now').optional(),
  ubicacion: Joi.string().max(100).optional().allow('', null)
}).min(1);

// ===== ESQUEMAS DE VALIDACIÓN PARA CÁRCELES =====

const carcelSchema = Joi.object({
  nombre_oficial: Joi.string().min(5).max(200).required().messages({
    'string.min': 'El nombre oficial debe tener al menos 5 caracteres',
    'string.max': 'El nombre oficial no puede exceder 200 caracteres',
    'any.required': 'El nombre oficial es requerido'
  }),
  apodo: Joi.string().max(50).optional().allow('', null),
  ubicacion: Joi.string().max(100).optional().allow('', null)
});

const carcelUpdateSchema = Joi.object({
  nombre_oficial: Joi.string().min(5).max(200).optional(),
  apodo: Joi.string().max(50).optional().allow('', null),
  ubicacion: Joi.string().max(100).optional().allow('', null)
}).min(1);

// ===== ESQUEMAS DE VALIDACIÓN PARA ESTATUS PENITENCIARIO =====

const estatusSchema = Joi.object({
  id_delincuente: Joi.number().integer().positive().required().messages({
    'number.positive': 'El ID de delincuente debe ser un número positivo',
    'any.required': 'El ID de delincuente es requerido'
  }),
  id_carcel: Joi.number().integer().positive().required().messages({
    'number.positive': 'El ID de cárcel debe ser un número positivo',
    'any.required': 'El ID de cárcel es requerido'
  }),
  id_celda: Joi.string().min(1).max(20).required().messages({
    'string.min': 'El ID de celda es requerido',
    'string.max': 'El ID de celda no puede exceder 20 caracteres',
    'any.required': 'El ID de celda es requerido'
  }),
  fecha_ingreso: Joi.date().max('now').required().messages({
    'date.max': 'La fecha de ingreso no puede ser futura',
    'any.required': 'La fecha de ingreso es requerida'
  }),
  fecha_salida_prevista: Joi.date().min(Joi.ref('fecha_ingreso')).optional().allow(null).messages({
    'date.min': 'La fecha de salida prevista debe ser posterior a la fecha de ingreso'
  }),
  motivo_encarcelamiento: Joi.string().min(5).max(200).required().messages({
    'string.min': 'El motivo de encarcelamiento debe tener al menos 5 caracteres',
    'string.max': 'El motivo de encarcelamiento no puede exceder 200 caracteres',
    'any.required': 'El motivo de encarcelamiento es requerido'
  })
});

const estatusUpdateSchema = Joi.object({
  id_celda: Joi.string().min(1).max(20).optional(),
  fecha_salida_prevista: Joi.date().optional().allow(null),
  motivo_encarcelamiento: Joi.string().min(5).max(200).optional()
}).min(1);

// ===== ESQUEMAS DE VALIDACIÓN PARA USUARIOS =====

const usuarioSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required().messages({
    'string.alphanum': 'El username solo puede contener letras y números',
    'string.min': 'El username debe tener al menos 3 caracteres',
    'string.max': 'El username no puede exceder 50 caracteres',
    'any.required': 'El username es requerido'
  }),
  email: Joi.string().email().max(100).required().messages({
    'string.email': 'Debe ser un email válido',
    'string.max': 'El email no puede exceder 100 caracteres',
    'any.required': 'El email es requerido'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.pattern.base': 'La contraseña debe contener al menos: una minúscula, una mayúscula, un número y un carácter especial',
    'any.required': 'La contraseña es requerida'
  }),
  roles: Joi.array().items(Joi.number().integer().positive()).optional()
});

const usuarioUpdateSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).optional(),
  email: Joi.string().email().max(100).optional(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).optional(),
  activo: Joi.boolean().optional()
}).min(1);

// ===== ESQUEMAS DE VALIDACIÓN PARA ROLES =====

const rolSchema = Joi.object({
  nombre: Joi.string().min(3).max(50).required().messages({
    'string.min': 'El nombre del rol debe tener al menos 3 caracteres',
    'string.max': 'El nombre del rol no puede exceder 50 caracteres',
    'any.required': 'El nombre del rol es requerido'
  }),
  descripcion: Joi.string().max(200).optional().allow('', null),
  permisos: Joi.array().items(Joi.number().integer().positive()).optional()
});

// ===== ESQUEMAS DE VALIDACIÓN PARA PERMISOS =====

const permisoSchema = Joi.object({
  modulo: Joi.string().valid(
    'personas', 'delincuentes', 'crimenes', 'carceles', 'estatus_penitenciario', 
    'usuarios', 'roles', 'permisos', 'reportes', 'dashboard'
  ).required().messages({
    'any.only': 'El módulo debe ser uno de los módulos válidos del sistema',
    'any.required': 'El módulo es requerido'
  }),
  accion: Joi.string().valid('crear', 'leer', 'actualizar', 'eliminar', 'administrar').required().messages({
    'any.only': 'La acción debe ser: crear, leer, actualizar, eliminar o administrar',
    'any.required': 'La acción es requerida'
  }),
  descripcion: Joi.string().max(200).optional().allow('', null)
});

// ===== ESQUEMAS DE VALIDACIÓN PARA AUTENTICACIÓN =====

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'any.required': 'El username es requerido'
  }),
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es requerida'
  })
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().max(100).required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
});

// ===== MIDDLEWARE DE VALIDACIÓN =====

// Personas
const validatePersona = createValidationMiddleware(personaSchema);
const validatePersonaUpdate = createValidationMiddleware(personaUpdateSchema);

// Delincuentes
const validateDelincuente = createValidationMiddleware(delincuenteSchema);
const validateDelincuenteUpdate = createValidationMiddleware(delincuenteUpdateSchema);

// Crímenes
const validateCrimen = createValidationMiddleware(crimenSchema);
const validateCrimenUpdate = createValidationMiddleware(crimenUpdateSchema);

// Cárceles
const validateCarcel = createValidationMiddleware(carcelSchema);
const validateCarcelUpdate = createValidationMiddleware(carcelUpdateSchema);

// Estatus penitenciario
const validateEstatus = createValidationMiddleware(estatusSchema);
const validateEstatusUpdate = createValidationMiddleware(estatusUpdateSchema);

// Usuarios
const validateUsuario = createValidationMiddleware(usuarioSchema);
const validateUsuarioUpdate = createValidationMiddleware(usuarioUpdateSchema);

// Roles
const validateRol = createValidationMiddleware(rolSchema);

// Permisos
const validatePermiso = createValidationMiddleware(permisoSchema);

// Autenticación
const validateLogin = createValidationMiddleware(loginSchema);
const validateRegister = createValidationMiddleware(registerSchema);

// Validación de parámetros en URL
const validateIdParam = (req, res, next) => {
  const { error } = Joi.number().integer().positive().validate(req.params.id);
  
  if (error) {
    return res.status(400).json({
      error: 'ID inválido',
      code: 'INVALID_ID',
      message: 'El ID debe ser un número entero positivo'
    });
  }
  
  next();
};

// Validación de parámetros de paginación
const validatePagination = (req, res, next) => {
  const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    search: Joi.string().max(100).default(''),
    sortBy: Joi.string().max(50).default('id'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  });

  const { error, value } = paginationSchema.validate(req.query, { allowUnknown: true });
  
  if (error) {
    return res.status(400).json(handleValidationError(error));
  }
  
  // Asignar valores validados y con defaults
  Object.assign(req.query, value);
  next();
};

module.exports = {
  // Validaciones de entidades
  validatePersona,
  validatePersonaUpdate,
  validateDelincuente,
  validateDelincuenteUpdate,
  validateCrimen,
  validateCrimenUpdate,
  validateCarcel,
  validateCarcelUpdate,
  validateEstatus,
  validateEstatusUpdate,
  validateUsuario,
  validateUsuarioUpdate,
  validateRol,
  validatePermiso,
  
  // Validaciones de autenticación
  validateLogin,
  validateRegister,
  
  // Validaciones de parámetros
  validateIdParam,
  validatePagination,
  
  // Helpers
  handleValidationError,
  createValidationMiddleware
};