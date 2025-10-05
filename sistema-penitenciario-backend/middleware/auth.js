const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware de autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido',
        code: 'MISSING_TOKEN' 
      });
    }

    // Verificar si el token está en la blacklist (sesiones invalidadas)
    const { data: blacklistCheck, error: blacklistError } = await supabase
      .from('sesion_usuario')
      .select('id')
      .eq('token_hash', token)
      .eq('activa', false)
      .limit(1);

    if (blacklistError) {
      console.error('Error verificando blacklist:', blacklistError);
    }

    if (blacklistCheck && blacklistCheck.length > 0) {
      return res.status(401).json({ 
        error: 'Token inválido o expirado',
        code: 'INVALID_TOKEN' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          error: 'Token inválido',
          code: 'INVALID_TOKEN' 
        });
      }

      // Verificar que el usuario siga activo
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id, username, activo')
        .eq('id', decoded.userId)
        .single();

      if (userError || !userData || !userData.activo) {
        return res.status(401).json({ 
          error: 'Usuario no encontrado o inactivo',
          code: 'USER_INACTIVE' 
        });
      }

      // Obtener permisos del usuario
      const userPermissions = await getUserPermissions(decoded.userId);
      
      req.user = {
        id: decoded.userId,
        userId: decoded.userId, // Mantener compatibilidad
        username: userData.username,
        permissions: userPermissions
      };

      next();
    });
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR' 
    });
  }
};

// Middleware de autorización por permisos
const requirePermission = (modulo, accion) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hasPermission = req.user.permissions.some(
      permission => permission.modulo === modulo && permission.accion === accion
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: `No tienes permisos para ${accion} en ${modulo}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: { modulo, accion }
      });
    }

    next();
  };
};

// Middleware de autorización por rol
const requireRole = (roleName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from('usuario_rol')
        .select(`
          rol!inner(nombre)
        `)
        .eq('id_usuario', req.user.id)
        .eq('activo', true)
        .eq('rol.activo', true);

      if (rolesError) {
        console.error('Error verificando rol:', rolesError);
        return res.status(500).json({ 
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR' 
        });
      }

      const hasRole = userRoles?.some(ur => ur.rol?.nombre === roleName);

      if (!hasRole) {
        return res.status(403).json({
          error: `Se requiere rol de ${roleName}`,
          code: 'INSUFFICIENT_ROLE'
        });
      }

      next();
    } catch (error) {
      console.error('Error verificando rol:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  };
};

// Función para obtener permisos del usuario
const getUserPermissions = async (userId) => {
  try {
    const { data: permissions, error } = await supabase
      .from('usuario_rol')
      .select(`
        rol!inner(
          activo,
          rol_permiso!inner(
            permiso!inner(modulo, accion, descripcion)
          )
        )
      `)
      .eq('id_usuario', userId)
      .eq('activo', true)
      .eq('rol.activo', true);

    if (error) {
      console.error('Error obteniendo permisos:', error);
      return [];
    }

    // Procesar permisos únicos
    const permisosUnicos = [];
    const permisosSet = new Set();

    permissions?.forEach(ur => {
      if (ur.rol && ur.rol.activo) {
        ur.rol.rol_permiso?.forEach(rp => {
          if (rp.permiso) {
            const permisoKey = `${rp.permiso.modulo}-${rp.permiso.accion}`;
            if (!permisosSet.has(permisoKey)) {
              permisosSet.add(permisoKey);
              permisosUnicos.push({
                modulo: rp.permiso.modulo,
                accion: rp.permiso.accion,
                descripcion: rp.permiso.descripcion
              });
            }
          }
        });
      }
    });

    return permisosUnicos;
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    return [];
  }
};

// Middleware para usuarios administradores únicamente
const requireAdmin = requireRole('administrador');

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        req.user = null;
        return next();
      }

      try {
        // Verificar que el usuario siga activo
        const { data: userData, error: userError } = await supabase
          .from('usuario')
          .select('id, username, activo')
          .eq('id', decoded.userId)
          .single();

        if (userError || !userData || !userData.activo) {
          req.user = null;
          return next();
        }

        const userPermissions = await getUserPermissions(decoded.userId);
        req.user = {
          id: decoded.userId,
          userId: decoded.userId, // Mantener compatibilidad
          username: userData.username,
          permissions: userPermissions
        };

        next();
      } catch (error) {
        console.error('Error en autenticación opcional:', error);
        req.user = null;
        next();
      }
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

// Middleware para verificar múltiples roles (OR)
const requireAnyRole = (roleNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from('usuario_rol')
        .select(`
          rol!inner(nombre)
        `)
        .eq('id_usuario', req.user.id)
        .eq('activo', true)
        .eq('rol.activo', true);

      if (rolesError) {
        console.error('Error verificando roles:', rolesError);
        return res.status(500).json({ 
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR' 
        });
      }

      const userRoleNames = userRoles?.map(ur => ur.rol?.nombre) || [];
      const hasAnyRole = roleNames.some(roleName => userRoleNames.includes(roleName));

      if (!hasAnyRole) {
        return res.status(403).json({
          error: `Se requiere uno de los siguientes roles: ${roleNames.join(', ')}`,
          code: 'INSUFFICIENT_ROLE'
        });
      }

      next();
    } catch (error) {
      console.error('Error verificando roles:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  };
};

// Middleware para verificar múltiples permisos (AND)
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const missingPermissions = permissions.filter(({ modulo, accion }) => {
      return !req.user.permissions.some(
        permission => permission.modulo === modulo && permission.accion === accion
      );
    });

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        missing: missingPermissions
      });
    }

    next();
  };
};

// Middleware para verificar múltiples permisos (OR)
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hasAnyPermission = permissions.some(({ modulo, accion }) => {
      return req.user.permissions.some(
        permission => permission.modulo === modulo && permission.accion === accion
      );
    });

    if (!hasAnyPermission) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  requireAdmin,
  optionalAuth,
  getUserPermissions,
  requireAnyRole,
  requireAllPermissions,
  requireAnyPermission
};