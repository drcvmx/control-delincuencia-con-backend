const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== CONTROLADORES DE USUARIOS =====

// Obtener todos los usuarios con paginación
const getUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'username', sortOrder = 'asc', activo } = req.query;
    const offset = (page - 1) * limit;

    // Validar campos de ordenamiento
    const validSortFields = ['id', 'username', 'email', 'fecha_creacion', 'fecha_ultimo_acceso'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'username';
    const ascending = sortOrder.toLowerCase() !== 'desc';

    // Construir query base
    let query = supabase
      .from('usuario')
      .select(`
        id,
        username,
        email,
        activo,
        fecha_creacion,
        fecha_ultimo_acceso,
        intentos_fallidos,
        bloqueado_hasta,
        usuario_rol!inner(
          rol(nombre)
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (activo !== undefined) {
      query = query.eq('activo', activo === 'true');
    }

    // Aplicar ordenamiento y paginación
    query = query
      .order(sortField, { ascending })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: usuarios, error, count } = await query;

    if (error) {
      console.error('Error Supabase:', error);
      return res.status(500).json({
        error: 'Error obteniendo usuarios',
        code: 'SUPABASE_ERROR'
      });
    }

    // Procesar roles para cada usuario
    const usuariosConRoles = usuarios.map(usuario => ({
      ...usuario,
      roles: usuario.usuario_rol
        ?.filter(ur => ur.rol)
        .map(ur => ur.rol.nombre)
        .join(', ') || ''
    }));

    // Limpiar la propiedad usuario_rol
    usuariosConRoles.forEach(usuario => {
      delete usuario.usuario_rol;
    });

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      usuarios: usuariosConRoles,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener un usuario por ID
const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;

    // Información básica del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuario')
      .select('id, username, email, activo, fecha_creacion, fecha_ultimo_acceso, intentos_fallidos, bloqueado_hasta')
      .eq('id', id)
      .single();

    if (usuarioError || !usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Roles del usuario
    const { data: roles, error: rolesError } = await supabase
      .from('usuario_rol')
      .select(`
        fecha_asignacion,
        activo,
        rol(id, nombre, descripcion)
      `)
      .eq('id_usuario', id)
      .order('fecha_asignacion', { ascending: false });

    if (rolesError) {
      console.error('Error obteniendo roles:', rolesError);
    }

    // Permisos del usuario (a través de roles)
    const { data: permisos, error: permisosError } = await supabase
      .from('usuario_rol')
      .select(`
        rol!inner(
          rol_permiso!inner(
            permiso(id, modulo, accion, descripcion)
          )
        )
      `)
      .eq('id_usuario', id)
      .eq('activo', true)
      .eq('rol.activo', true);

    if (permisosError) {
      console.error('Error obteniendo permisos:', permisosError);
    }

    // Procesar permisos únicos
    const permisosUnicos = [];
    const permisosSet = new Set();

    permisos?.forEach(ur => {
      ur.rol?.rol_permiso?.forEach(rp => {
        if (rp.permiso) {
          const permisoKey = `${rp.permiso.modulo}-${rp.permiso.accion}`;
          if (!permisosSet.has(permisoKey)) {
            permisosSet.add(permisoKey);
            permisosUnicos.push(rp.permiso);
          }
        }
      });
    });

    // Sesiones recientes
    const { data: sesiones, error: sesionesError } = await supabase
      .from('sesion_usuario')
      .select('id, fecha_inicio, fecha_expiracion, ip_address, user_agent, activa')
      .eq('id_usuario', id)
      .order('fecha_inicio', { ascending: false })
      .limit(10);

    if (sesionesError) {
      console.error('Error obteniendo sesiones:', sesionesError);
    }

    // Procesar roles para respuesta
    const rolesFormateados = roles?.map(ur => ({
      id: ur.rol?.id,
      nombre: ur.rol?.nombre,
      descripcion: ur.rol?.descripcion,
      fecha_asignacion: ur.fecha_asignacion,
      activo: ur.activo
    })) || [];

    res.json({
      usuario,
      roles: rolesFormateados,
      permisos: permisosUnicos,
      sesionesRecientes: sesiones || []
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nuevo usuario
const createUsuario = async (req, res) => {
  try {
    const { username, email, password, roles = [] } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email y password son requeridos',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuario')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (checkError) {
      console.error('Error verificando usuario existente:', checkError);
      return res.status(500).json({
        error: 'Error verificando usuario',
        code: 'SUPABASE_ERROR'
      });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({
        error: 'Usuario o email ya existe',
        code: 'USER_EXISTS'
      });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario
    const { data: newUser, error: createError } = await supabase
      .from('usuario')
      .insert({
        username,
        email,
        password_hash: passwordHash
      })
      .select('id, username, email, activo, fecha_creacion')
      .single();

    if (createError) {
      console.error('Error creando usuario:', createError);
      return res.status(500).json({
        error: 'Error creando usuario',
        code: 'SUPABASE_ERROR'
      });
    }

    // Asignar roles si se proporcionaron
    if (roles.length > 0) {
      // Verificar que los roles existen
      const { data: rolesValidos, error: rolesError } = await supabase
        .from('rol')
        .select('id')
        .in('id', roles);

      if (rolesError) {
        console.error('Error verificando roles:', rolesError);
      } else if (rolesValidos && rolesValidos.length > 0) {
        const asignacionesRoles = rolesValidos.map(rol => ({
          id_usuario: newUser.id,
          id_rol: rol.id
        }));

        const { error: asignacionError } = await supabase
          .from('usuario_rol')
          .insert(asignacionesRoles);

        if (asignacionError) {
          console.error('Error asignando roles:', asignacionError);
        }
      }
    }

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: newUser
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Actualizar usuario
const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Verificar que el usuario existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuario')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar duplicados si se está actualizando username o email
    if (updates.username || updates.email) {
      const { data: duplicates, error: duplicateError } = await supabase
        .from('usuario')
        .select('id')
        .neq('id', id);

      if (updates.username) {
        const { data: usernameCheck } = await supabase
          .from('usuario')
          .select('id')
          .eq('username', updates.username)
          .neq('id', id)
          .limit(1);

        if (usernameCheck && usernameCheck.length > 0) {
          return res.status(409).json({
            error: 'Username ya existe',
            code: 'USER_EXISTS'
          });
        }
      }

      if (updates.email) {
        const { data: emailCheck } = await supabase
          .from('usuario')
          .select('id')
          .eq('email', updates.email)
          .neq('id', id)
          .limit(1);

        if (emailCheck && emailCheck.length > 0) {
          return res.status(409).json({
            error: 'Email ya existe',
            code: 'USER_EXISTS'
          });
        }
      }
    }

    // Hash de nueva contraseña si se proporciona
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }

    // Remover campos que no deben actualizarse
    delete updates.id;
    delete updates.fecha_creacion;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos para actualizar',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('usuario')
      .update(updates)
      .eq('id', id)
      .select('id, username, email, activo, fecha_creacion, fecha_ultimo_acceso')
      .single();

    if (updateError) {
      console.error('Error actualizando usuario:', updateError);
      return res.status(500).json({
        error: 'Error actualizando usuario',
        code: 'SUPABASE_ERROR'
      });
    }

    res.json({
      message: 'Usuario actualizado exitosamente',
      usuario: updatedUser
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Eliminar usuario
const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuario')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Eliminar sesiones
    const { error: sesionesError } = await supabase
      .from('sesion_usuario')
      .delete()
      .eq('id_usuario', id);

    if (sesionesError) {
      console.error('Error eliminando sesiones:', sesionesError);
    }

    // Eliminar asignaciones de roles
    const { error: rolesError } = await supabase
      .from('usuario_rol')
      .delete()
      .eq('id_usuario', id);

    if (rolesError) {
      console.error('Error eliminando roles:', rolesError);
    }

    // Eliminar usuario
    const { error: deleteError } = await supabase
      .from('usuario')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error eliminando usuario:', deleteError);
      return res.status(500).json({
        error: 'Error eliminando usuario',
        code: 'SUPABASE_ERROR'
      });
    }

    res.json({
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Asignar rol a usuario
const asignarRol = async (req, res) => {
  try {
    const { id } = req.params; // ID del usuario
    const { rol_id } = req.body;

    // Verificar que el usuario existe
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuario')
      .select('id')
      .eq('id', id)
      .single();

    if (usuarioError || !usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar que el rol existe
    const { data: rol, error: rolError } = await supabase
      .from('rol')
      .select('id, nombre')
      .eq('id', rol_id)
      .single();

    if (rolError || !rol) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        code: 'ROLE_NOT_FOUND'
      });
    }

    // Verificar si ya existe la asignación
    const { data: existing, error: existingError } = await supabase
      .from('usuario_rol')
      .select('*')
      .eq('id_usuario', id)
      .eq('id_rol', rol_id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error verificando asignación:', existingError);
      return res.status(500).json({
        error: 'Error verificando asignación',
        code: 'SUPABASE_ERROR'
      });
    }

    if (existing) {
      // Si existe pero está inactiva, reactivarla
      if (!existing.activo) {
        const { error: updateError } = await supabase
          .from('usuario_rol')
          .update({
            activo: true,
            fecha_asignacion: new Date().toISOString()
          })
          .eq('id_usuario', id)
          .eq('id_rol', rol_id);

        if (updateError) {
          console.error('Error reactivando rol:', updateError);
          return res.status(500).json({
            error: 'Error reactivando rol',
            code: 'SUPABASE_ERROR'
          });
        }

        res.json({
          message: 'Rol reactivado para el usuario exitosamente'
        });
      } else {
        return res.status(409).json({
          error: 'El usuario ya tiene este rol asignado',
          code: 'ROLE_ALREADY_ASSIGNED'
        });
      }
    } else {
      // Crear nueva asignación
      const { error: insertError } = await supabase
        .from('usuario_rol')
        .insert({
          id_usuario: id,
          id_rol: rol_id,
          asignado_por: req.user?.userId || null
        });

      if (insertError) {
        console.error('Error asignando rol:', insertError);
        return res.status(500).json({
          error: 'Error asignando rol',
          code: 'SUPABASE_ERROR'
        });
      }

      res.status(201).json({
        message: 'Rol asignado al usuario exitosamente'
      });
    }

  } catch (error) {
    console.error('Error asignando rol:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Revocar rol de usuario
const revocarRol = async (req, res) => {
  try {
    const { id, rol_id } = req.params;

    // Verificar que existe la asignación
    const { data: asignacion, error: checkError } = await supabase
      .from('usuario_rol')
      .select('*')
      .eq('id_usuario', id)
      .eq('id_rol', rol_id)
      .eq('activo', true)
      .single();

    if (checkError || !asignacion) {
      return res.status(404).json({
        error: 'Asignación de rol no encontrada',
        code: 'ROLE_ASSIGNMENT_NOT_FOUND'
      });
    }

    // Desactivar la asignación
    const { error: updateError } = await supabase
      .from('usuario_rol')
      .update({ activo: false })
      .eq('id_usuario', id)
      .eq('id_rol', rol_id);

    if (updateError) {
      console.error('Error revocando rol:', updateError);
      return res.status(500).json({
        error: 'Error revocando rol',
        code: 'SUPABASE_ERROR'
      });
    }

    res.json({
      message: 'Rol revocado del usuario exitosamente'
    });

  } catch (error) {
    console.error('Error revocando rol:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// ===== CONTROLADORES DE ROLES =====

// Obtener todos los roles
const getRoles = async (req, res) => {
  try {
    const { activo } = req.query;

    let query = supabase
      .from('rol')
      .select(`
        *,
        usuario_rol!left(id_usuario),
        rol_permiso!left(id_permiso)
      `);

    if (activo !== undefined) {
      query = query.eq('activo', activo === 'true');
    }

    const { data: roles, error } = await query.order('nombre');

    if (error) {
      console.error('Error obteniendo roles:', error);
      return res.status(500).json({
        error: 'Error obteniendo roles',
        code: 'SUPABASE_ERROR'
      });
    }

    // Procesar conteos
    const rolesConConteos = roles.map(rol => ({
      ...rol,
      usuarios_asignados: rol.usuario_rol?.filter(ur => ur.id_usuario).length || 0,
      permisos_asignados: rol.rol_permiso?.filter(rp => rp.id_permiso).length || 0
    }));

    // Limpiar propiedades auxiliares
    rolesConConteos.forEach(rol => {
      delete rol.usuario_rol;
      delete rol.rol_permiso;
    });

    res.json({
      roles: rolesConConteos
    });

  } catch (error) {
    console.error('Error obteniendo roles:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nuevo rol
const createRol = async (req, res) => {
  try {
    const { nombre, descripcion, permisos = [] } = req.body;

    // Validar campos requeridos
    if (!nombre) {
      return res.status(400).json({
        error: 'El nombre del rol es requerido',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar que no existe un rol con el mismo nombre
    const { data: existing, error: checkError } = await supabase
      .from('rol')
      .select('id')
      .eq('nombre', nombre)
      .limit(1);

    if (checkError) {
      console.error('Error verificando rol existente:', checkError);
      return res.status(500).json({
        error: 'Error verificando rol',
        code: 'SUPABASE_ERROR'
      });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un rol con este nombre',
        code: 'ROLE_EXISTS'
      });
    }

    // Crear rol
    const { data: newRol, error: createError } = await supabase
      .from('rol')
      .insert({
        nombre,
        descripcion
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Error creando rol:', createError);
      return res.status(500).json({
        error: 'Error creando rol',
        code: 'SUPABASE_ERROR'
      });
    }

    // Asignar permisos si se proporcionaron
    if (permisos.length > 0) {
      // Verificar que los permisos existen
      const { data: permisosValidos, error: permisosError } = await supabase
        .from('permiso')
        .select('id')
        .in('id', permisos);

      if (permisosError) {
        console.error('Error verificando permisos:', permisosError);
      } else if (permisosValidos && permisosValidos.length > 0) {
        const asignacionesPermisos = permisosValidos.map(permiso => ({
          id_rol: newRol.id,
          id_permiso: permiso.id
        }));

        const { error: asignacionError } = await supabase
          .from('rol_permiso')
          .insert(asignacionesPermisos);

        if (asignacionError) {
          console.error('Error asignando permisos:', asignacionError);
        }
      }
    }

    res.status(201).json({
      message: 'Rol creado exitosamente',
      rol: newRol
    });

  } catch (error) {
    console.error('Error creando rol:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// ===== CONTROLADORES DE PERMISOS =====

// Obtener todos los permisos
const getPermisos = async (req, res) => {
  try {
    const { modulo } = req.query;

    let query = supabase
      .from('permiso')
      .select(`
        *,
        rol_permiso!left(id_rol)
      `);

    if (modulo) {
      query = query.eq('modulo', modulo);
    }

    const { data: permisos, error } = await query.order('modulo').order('accion');

    if (error) {
      console.error('Error obteniendo permisos:', error);
      return res.status(500).json({
        error: 'Error obteniendo permisos',
        code: 'SUPABASE_ERROR'
      });
    }

    // Procesar conteos y agrupar por módulo
    const permisosConConteos = permisos.map(permiso => ({
      ...permiso,
      roles_asignados: permiso.rol_permiso?.filter(rp => rp.id_rol).length || 0
    }));

    // Limpiar propiedades auxiliares
    permisosConConteos.forEach(permiso => {
      delete permiso.rol_permiso;
    });

    // Agrupar por módulo
    const permisosPorModulo = {};
    permisosConConteos.forEach(permiso => {
      if (!permisosPorModulo[permiso.modulo]) {
        permisosPorModulo[permiso.modulo] = [];
      }
      permisosPorModulo[permiso.modulo].push(permiso);
    });

    res.json({
      permisos: permisosConConteos,
      permisosPorModulo
    });

  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nuevo permiso
const createPermiso = async (req, res) => {
  try {
    const { modulo, accion, descripcion } = req.body;

    // Validar campos requeridos
    if (!modulo || !accion) {
      return res.status(400).json({
        error: 'Módulo y acción son requeridos',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar que no existe el permiso
    const { data: existing, error: checkError } = await supabase
      .from('permiso')
      .select('id')
      .eq('modulo', modulo)
      .eq('accion', accion)
      .limit(1);

    if (checkError) {
      console.error('Error verificando permiso existente:', checkError);
      return res.status(500).json({
        error: 'Error verificando permiso',
        code: 'SUPABASE_ERROR'
      });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un permiso para este módulo y acción',
        code: 'PERMISSION_EXISTS'
      });
    }

    const { data: newPermiso, error: createError } = await supabase
      .from('permiso')
      .insert({
        modulo,
        accion,
        descripcion
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Error creando permiso:', createError);
      return res.status(500).json({
        error: 'Error creando permiso',
        code: 'SUPABASE_ERROR'
      });
    }

    res.status(201).json({
      message: 'Permiso creado exitosamente',
      permiso: newPermiso
    });

  } catch (error) {
    console.error('Error creando permiso:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
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
};