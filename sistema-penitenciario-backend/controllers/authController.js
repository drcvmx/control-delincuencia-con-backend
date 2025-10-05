const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabase } = require('../src/config/database');
const { getUserPermissions } = require('../middleware/auth');

// Registrar nuevo usuario
const register = async (req, res) => {
  try {
    const { username, email, password, rolId } = req.body;

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('usuario')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'El usuario o email ya existe',
        code: 'USER_EXISTS'
      });
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insertar usuario
    const { data: newUser, error: userError } = await supabase
      .from('usuario')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        activo: true
      })
      .select()
      .single();

    if (userError) throw userError;

    // Asignar rol (por defecto 'usuario' si no se especifica)
    const defaultRolId = rolId || 2; // Asumiendo que 2 es el ID del rol 'usuario'
    
    const { error: roleError } = await supabase
      .from('usuario_rol')
      .insert({
        id_usuario: newUser.id,
        id_rol: defaultRolId,
        activo: true
      });

    if (roleError) throw roleError;

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Iniciar sesión
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Buscar usuario por username o email
    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select(`
        id, username, email, password_hash, activo, 
        intentos_fallidos, bloqueado_hasta
      `)
      .or(`username.eq.${username},email.eq.${username}`)
      .eq('activo', true)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar si el usuario está bloqueado
    if (user.bloqueado_hasta && new Date() < new Date(user.bloqueado_hasta)) {
      return res.status(423).json({
        error: 'Usuario bloqueado temporalmente',
        code: 'USER_LOCKED',
        bloqueadoHasta: user.bloqueado_hasta
      });
    }

    // Verificar contraseña
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      // Incrementar intentos fallidos
      const intentos = (user.intentos_fallidos || 0) + 1;
      const bloqueado = intentos >= 5;
      const bloqueoHasta = bloqueado ? 
        new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

      await supabase
        .from('usuario')
        .update({
          intentos_fallidos: intentos,
          bloqueado_hasta: bloqueoHasta
        })
        .eq('id', user.id);

      return res.status(401).json({
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS',
        intentosRestantes: Math.max(0, 5 - intentos)
      });
    }

    // Resetear intentos fallidos si el login es exitoso
    if (user.intentos_fallidos > 0) {
      await supabase
        .from('usuario')
        .update({
          intentos_fallidos: 0,
          bloqueado_hasta: null
        })
        .eq('id', user.id);
    }

    // Obtener roles y permisos del usuario
    const { data: userRoles, error: rolesError } = await supabase
      .from('usuario_rol')
      .select(`
        rol:id_rol (
          id, nombre,
          rol_permiso (
            permiso:id_permiso (
              id, modulo, accion, descripcion
            )
          )
        )
      `)
      .eq('id_usuario', user.id)
      .eq('activo', true);

    const roles = userRoles?.map(ur => ur.rol) || [];
    const permissions = roles.flatMap(role => 
      role.rol_permiso?.map(rp => rp.permiso) || []
    );

    // Generar tokens JWT - ✅ CORREGIDO
    const payload = {
  userId: user.id,
  username: user.username,
  email: user.email,
  roles: roles.map(r => ({ id: r.id, nombre: r.nombre })),
  permissions: permissions.map(p => `${p.modulo}-${p.accion}`) // ✅ Sin p.nombre
};

const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
});

const refreshToken = crypto.randomBytes(64).toString('hex');

    // Guardar sesión
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 30); // 30 días

    await supabase
      .from('sesion_usuario')
      .insert({
        id_usuario: user.id,
        refresh_token: refreshToken,
        expira_en: sessionExpiry.toISOString(),
        ip_address: clientIP,
        user_agent: userAgent,
        activo: true
      });

   
res.json({
  message: 'Login exitoso',
  user: {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: roles.map(r => ({ id: r.id, nombre: r.nombre })),
    permissions: permissions.map(p => `${p.modulo}-${p.accion}`), // ✅ Sin p.nombre
    activo: true,
    fecha_creacion: user.fecha_creacion,
    fecha_ultimo_acceso: new Date().toISOString()
  },
  token: accessToken,
  refreshToken
});

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Cerrar sesión
const logout = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (refreshToken) {
      // Invalidar el refresh token
      await supabase
        .from('sesion_usuario')
        .update({ activo: false })
        .eq('refresh_token', refreshToken);
    }

    res.json({
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Refrescar token
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verificar refresh token
    const { data: session, error: sessionError } = await supabase
      .from('sesion_usuario')
      .select(`
        id, id_usuario, expira_en,
        usuario:id_usuario (
          id, username, email, activo
        )
      `)
      .eq('refresh_token', refreshToken)
      .eq('activo', true)
      .single();

    if (sessionError || !session) {
      return res.status(401).json({
        error: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Verificar si el token ha expirado
    if (new Date() > new Date(session.expira_en)) {
      await supabase
        .from('sesion_usuario')
        .update({ activo: false })
        .eq('id', session.id);

      return res.status(401).json({
        error: 'Refresh token expirado',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    // Obtener roles y permisos del usuario
    const { data: userRoles } = await supabase
      .from('usuario_rol')
      .select(`
        rol:id_rol (
          id, nombre,
          rol_permiso (
            permiso:id_permiso (
              id, nombre, descripcion
            )
          )
        )
      `)
      .eq('id_usuario', session.usuario.id)
      .eq('activo', true);

    const roles = userRoles?.map(ur => ur.rol) || [];
    const permissions = roles.flatMap(role => 
      role.rol_permiso?.map(rp => rp.permiso) || []
    );

    // Generar nuevo access token
    const payload = {
      userId: session.usuario.id,
      username: session.usuario.username,
      email: session.usuario.email,
      roles: roles.map(r => r.nombre),
      permissions: permissions.map(p => p.nombre)
    };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
      message: 'Token refrescado exitosamente',
      token: newAccessToken
    });

  } catch (error) {
    console.error('Error refrescando token:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener perfil del usuario
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select(`
        id, username, email, activo, fecha_creacion, fecha_ultimo_acceso
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Obtener roles
    const { data: userRoles } = await supabase
      .from('usuario_rol')
      .select(`
        rol:id_rol (
          id, nombre, descripcion
        )
      `)
      .eq('id_usuario', userId)
      .eq('activo', true);

    const roles = userRoles?.map(ur => ur.rol) || [];

    res.json({
      user: {
        ...user,
        roles
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Obtener usuario actual
    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar contraseña actual
    const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        error: 'Contraseña actual incorrecta',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash de la nueva contraseña
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    const { error: updateError } = await supabase
      .from('usuario')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (updateError) throw updateError;

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Invalidar todas las sesiones
const invalidateAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    await supabase
      .from('sesion_usuario')
      .update({ activo: false })
      .eq('id_usuario', userId);

    res.json({
      message: 'Todas las sesiones han sido invalidadas'
    });

  } catch (error) {
    console.error('Error invalidando sesiones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  getProfile,
  changePassword,
  invalidateAllSessions
};