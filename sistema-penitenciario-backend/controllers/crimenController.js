const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Obtener todos los crímenes con paginación
const getCrimenes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'fecha_ocurrencia', sortOrder = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    // Validar campos de ordenamiento
    const validSortFields = ['id', 'descripcion', 'fecha_ocurrencia', 'ubicacion'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'fecha_ocurrencia';
    const ascending = sortOrder.toLowerCase() === 'asc';

    let query = supabase
      .from('crimen')
      .select(`
        *,
        delincuente_crimen(
          id_delincuente,
          rol,
          delincuente!inner(
            persona!inner(
              nombre,
              apellido_paterno
            )
          )
        )
      `, { count: 'exact' });

    // Aplicar búsqueda si existe
    if (search) {
      query = query.or(`descripcion.ilike.%${search}%,ubicacion.ilike.%${search}%`);
    }

    // Aplicar ordenamiento y paginación
    query = query
      .order(sortField, { ascending })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: crimenes, error, count } = await query;

    if (error) {
      console.error('Error obteniendo crímenes:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Procesar datos para agregar información de delincuentes
    const crimenesConDelincuentes = crimenes?.map(crimen => {
      const delincuentesAsociados = crimen.delincuente_crimen || [];
      const nombresDelincuentes = delincuentesAsociados
        .map(dc => `${dc.delincuente.persona.nombre} ${dc.delincuente.persona.apellido_paterno}`)
        .join(', ');

      return {
        ...crimen,
        total_delincuentes_asociados: delincuentesAsociados.length,
        delincuentes_nombres: nombresDelincuentes || null,
        delincuente_crimen: undefined // Remover para limpiar respuesta
      };
    }) || [];

    const totalRecords = count;
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      crimenes: crimenesConDelincuentes,
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
    console.error('Error obteniendo crímenes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener un crimen por ID con información completa
const getCrimenById = async (req, res) => {
  try {
    const { id } = req.params;

    // Información básica del crimen
    const { data: crimen, error } = await supabase
      .from('crimen')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !crimen) {
      return res.status(404).json({
        error: 'Crimen no encontrado',
        code: 'CRIME_NOT_FOUND'
      });
    }

    // Delincuentes asociados con información completa
    const { data: delincuentesAsociados } = await supabase
      .from('delincuente_crimen')
      .select(`
        fecha_participacion,
        rol,
        delincuente!inner(
          id_persona,
          alias,
          persona!inner(
            nombre,
            apellido_paterno,
            apellido_materno,
            fecha_de_nacimiento,
            fecha_de_fin
          )
        )
      `)
      .eq('id_crimen', id)
      .order('fecha_participacion', { ascending: false });

    // Calcular edad y procesar datos
    const delincuentesProcesados = delincuentesAsociados?.map(dc => {
      const persona = dc.delincuente.persona;
      const fechaNacimiento = new Date(persona.fecha_de_nacimiento);
      const fechaReferencia = persona.fecha_de_fin ? new Date(persona.fecha_de_fin) : new Date();
      const edad = Math.floor((fechaReferencia - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000));

      return {
        fecha_participacion: dc.fecha_participacion,
        rol: dc.rol,
        id_persona: dc.delincuente.id_persona,
        alias: dc.delincuente.alias,
        nombre: persona.nombre,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno,
        edad
      };
    }) || [];

    const roles = [...new Set(delincuentesProcesados.map(d => d.rol).filter(Boolean))];

    res.json({
      crimen,
      delincuentesAsociados: delincuentesProcesados,
      estadisticas: {
        totalDelincuentes: delincuentesProcesados.length,
        roles
      }
    });

  } catch (error) {
    console.error('Error obteniendo crimen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nuevo crimen
const createCrimen = async (req, res) => {
  try {
    const { descripcion, fecha_ocurrencia, ubicacion } = req.body;

    // Validar campos requeridos
    if (!descripcion || !fecha_ocurrencia) {
      return res.status(400).json({
        error: 'Descripción y fecha de ocurrencia son requeridos',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const { data: crimen, error } = await supabase
      .from('crimen')
      .insert([{
        descripcion,
        fecha_ocurrencia,
        ubicacion
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creando crimen:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    res.status(201).json({
      message: 'Crimen registrado exitosamente',
      crimen
    });

  } catch (error) {
    console.error('Error creando crimen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Actualizar crimen
const updateCrimen = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el crimen existe
    const { data: existing } = await supabase
      .from('crimen')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({
        error: 'Crimen no encontrado',
        code: 'CRIME_NOT_FOUND'
      });
    }

    // Filtrar campos válidos para actualización
    const validFields = ['descripcion', 'fecha_ocurrencia', 'ubicacion'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (validFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos válidos para actualizar',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    const { data: crimen, error } = await supabase
      .from('crimen')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando crimen:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    res.json({
      message: 'Crimen actualizado exitosamente',
      crimen
    });

  } catch (error) {
    console.error('Error actualizando crimen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Eliminar crimen
const deleteCrimen = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el crimen existe
    const { data: existing } = await supabase
      .from('crimen')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({
        error: 'Crimen no encontrado',
        code: 'CRIME_NOT_FOUND'
      });
    }

    // Verificar si tiene delincuentes asociados
    const { data: asociaciones } = await supabase
      .from('delincuente_crimen')
      .select('id_delincuente')
      .eq('id_crimen', id)
      .limit(1);

    if (asociaciones && asociaciones.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el crimen porque tiene delincuentes asociados',
        code: 'HAS_ASSOCIATED_DELINQUENTS'
      });
    }

    const { error } = await supabase
      .from('crimen')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando crimen:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    res.json({
      message: 'Crimen eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando crimen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Asociar delincuente con crimen
const asociarDelincuente = async (req, res) => {
  try {
    const { id } = req.params; // ID del crimen
    const { id_delincuente, fecha_participacion, rol } = req.body;

    // Verificar que el crimen existe
    const { data: crimen } = await supabase
      .from('crimen')
      .select('id')
      .eq('id', id)
      .single();

    if (!crimen) {
      return res.status(404).json({
        error: 'Crimen no encontrado',
        code: 'CRIME_NOT_FOUND'
      });
    }

    // Verificar que el delincuente existe
    const { data: delincuente } = await supabase
      .from('delincuente')
      .select('id_persona')
      .eq('id_persona', id_delincuente)
      .single();

    if (!delincuente) {
      return res.status(404).json({
        error: 'Delincuente no encontrado',
        code: 'DELINQUENT_NOT_FOUND'
      });
    }

    // Verificar si ya existe la asociación
    const { data: existing } = await supabase
      .from('delincuente_crimen')
      .select('*')
      .eq('id_delincuente', id_delincuente)
      .eq('id_crimen', id)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'El delincuente ya está asociado a este crimen',
        code: 'ASSOCIATION_EXISTS'
      });
    }

    // Crear la asociación
    const { data: asociacion, error } = await supabase
      .from('delincuente_crimen')
      .insert([{
        id_delincuente,
        id_crimen: id,
        fecha_participacion,
        rol
      }])
      .select()
      .single();

    if (error) {
      console.error('Error asociando delincuente con crimen:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Obtener información completa de la asociación
    const { data: asociacionCompleta } = await supabase
      .from('delincuente_crimen')
      .select(`
        *,
        delincuente!inner(
          alias,
          persona!inner(
            nombre,
            apellido_paterno,
            apellido_materno
          )
        ),
        crimen!inner(
          descripcion
        )
      `)
      .eq('id_delincuente', id_delincuente)
      .eq('id_crimen', id)
      .single();

    res.status(201).json({
      message: 'Delincuente asociado al crimen exitosamente',
      asociacion: asociacionCompleta
    });

  } catch (error) {
    console.error('Error asociando delincuente con crimen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Desasociar delincuente de crimen
const desasociarDelincuente = async (req, res) => {
  try {
    const { id, delincuente_id } = req.params;

    // Verificar que la asociación existe
    const { data: asociacion } = await supabase
      .from('delincuente_crimen')
      .select('*')
      .eq('id_delincuente', delincuente_id)
      .eq('id_crimen', id)
      .single();

    if (!asociacion) {
      return res.status(404).json({
        error: 'Asociación no encontrada',
        code: 'ASSOCIATION_NOT_FOUND'
      });
    }

    // Eliminar la asociación
    const { error } = await supabase
      .from('delincuente_crimen')
      .delete()
      .eq('id_delincuente', delincuente_id)
      .eq('id_crimen', id);

    if (error) {
      console.error('Error desasociando delincuente de crimen:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    res.json({
      message: 'Delincuente desasociado del crimen exitosamente'
    });

  } catch (error) {
    console.error('Error desasociando delincuente de crimen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Búsqueda avanzada de crímenes
const searchCrimenes = async (req, res) => {
  try {
    const {
      descripcion,
      ubicacion,
      fecha_desde,
      fecha_hasta,
      con_delincuentes_asociados
    } = req.query;

    let query = supabase
      .from('crimen')
      .select(`
        *,
        delincuente_crimen(
          rol
        )
      `);

    // Aplicar filtros
    if (descripcion) {
      query = query.ilike('descripcion', `%${descripcion}%`);
    }

    if (ubicacion) {
      query = query.ilike('ubicacion', `%${ubicacion}%`);
    }

    if (fecha_desde) {
      query = query.gte('fecha_ocurrencia', fecha_desde);
    }

    if (fecha_hasta) {
      query = query.lte('fecha_ocurrencia', fecha_hasta);
    }

    query = query.order('fecha_ocurrencia', { ascending: false });

    const { data: crimenes, error } = await query;

    if (error) {
      console.error('Error en búsqueda avanzada de crímenes:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Procesar resultados y aplicar filtro de delincuentes asociados
    let crimenesProcessed = crimenes?.map(crimen => {
      const delincuentesAsociados = crimen.delincuente_crimen || [];
      const roles = [...new Set(delincuentesAsociados.map(dc => dc.rol).filter(Boolean))];

      return {
        ...crimen,
        total_delincuentes_asociados: delincuentesAsociados.length,
        roles_involucrados: roles.join(', ') || null,
        delincuente_crimen: undefined
      };
    }) || [];

    // Filtrar por delincuentes asociados si se especifica
    if (con_delincuentes_asociados === 'true') {
      crimenesProcessed = crimenesProcessed.filter(c => c.total_delincuentes_asociados > 0);
    } else if (con_delincuentes_asociados === 'false') {
      crimenesProcessed = crimenesProcessed.filter(c => c.total_delincuentes_asociados === 0);
    }

    res.json({
      crimenes: crimenesProcessed,
      total: crimenesProcessed.length,
      filtros: {
        descripcion,
        ubicacion,
        fecha_desde,
        fecha_hasta,
        con_delincuentes_asociados
      }
    });

  } catch (error) {
    console.error('Error en búsqueda avanzada de crímenes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener estadísticas de crímenes
const getEstadisticas = async (req, res) => {
  try {
    // Total de crímenes
    const { count: total } = await supabase
      .from('crimen')
      .select('*', { count: 'exact', head: true });

    // Crímenes por mes en el último año
    const fechaLimite = new Date();
    fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);

    const { data: crimenesRecientes } = await supabase
      .from('crimen')
      .select('fecha_ocurrencia')
      .gte('fecha_ocurrencia', fechaLimite.toISOString().split('T')[0]);

    // Procesar crímenes mensuales
    const crimenesMenuales = {};
    crimenesRecientes?.forEach(crimen => {
      const fecha = new Date(crimen.fecha_ocurrencia);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      crimenesMenuales[mes] = (crimenesMenuales[mes] || 0) + 1;
    });

    const crimenesMenualesArray = Object.entries(crimenesMenuales)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Crímenes más frecuentes por ubicación
    const { data: crimenesPorUbicacion } = await supabase
      .from('crimen')
      .select('ubicacion')
      .not('ubicacion', 'is', null);

    const ubicacionesCount = {};
    crimenesPorUbicacion?.forEach(crimen => {
      const ubicacion = crimen.ubicacion;
      ubicacionesCount[ubicacion] = (ubicacionesCount[ubicacion] || 0) + 1;
    });

    const ubicacionesMasFrecuentes = Object.entries(ubicacionesCount)
      .map(([ubicacion, total]) => ({ ubicacion, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Crímenes con más delincuentes asociados
    const { data: crimenesConDelincuentes } = await supabase
      .from('crimen')
      .select(`
        id,
        descripcion,
        fecha_ocurrencia,
        ubicacion,
        delincuente_crimen(
          id_delincuente
        )
      `);

    const crimenesMasComplejos = crimenesConDelincuentes
      ?.map(crimen => ({
        id: crimen.id,
        descripcion: crimen.descripcion,
        fecha_ocurrencia: crimen.fecha_ocurrencia,
        ubicacion: crimen.ubicacion,
        total_delincuentes: crimen.delincuente_crimen?.length || 0
      }))
      .filter(crimen => crimen.total_delincuentes > 0)
      .sort((a, b) => b.total_delincuentes - a.total_delincuentes)
      .slice(0, 10) || [];

    // Roles más comunes
    const { data: roles } = await supabase
      .from('delincuente_crimen')
      .select('rol')
      .not('rol', 'is', null);

    const rolesCount = {};
    roles?.forEach(item => {
      const rol = item.rol;
      rolesCount[rol] = (rolesCount[rol] || 0) + 1;
    });

    const rolesMasComunes = Object.entries(rolesCount)
      .map(([rol, total]) => ({ rol, total }))
      .sort((a, b) => b.total - a.total);

    res.json({
      resumen: {
        total: total || 0
      },
      crimenesMenuales: crimenesMenualesArray,
      ubicacionesMasFrecuentes,
      crimenesMasComplejos,
      rolesMasComunes
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de crímenes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getCrimenes,
  getCrimenById,
  createCrimen,
  updateCrimen,
  deleteCrimen,
  asociarDelincuente,
  desasociarDelincuente,
  searchCrimenes,
  getEstadisticas
};