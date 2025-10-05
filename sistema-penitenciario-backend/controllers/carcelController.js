const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Obtener todas las cárceles con paginación y filtros
const getCarceles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'nombre_oficial',
      sortOrder = 'asc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir query base
    let query = supabase
      .from('carcel')
      .select(`
        *,
        estatus_penitenciario!inner(
          id_delincuente,
          fecha_salida_real
        )
      `, { count: 'exact' });

    // Aplicar filtros de búsqueda
    if (search) {
      query = query.or(`nombre_oficial.ilike.%${search}%,apodo.ilike.%${search}%,ubicacion.ilike.%${search}%`);
    }

    // Aplicar ordenamiento
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Aplicar paginación
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: carceles, error, count } = await query;

    if (error) {
      console.error('Error obteniendo cárceles:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Procesar datos para agregar estadísticas
    const carcelesConEstadisticas = carceles.map(carcel => {
      const reclusosActuales = carcel.estatus_penitenciario?.filter(ep => !ep.fecha_salida_real).length || 0;
      const totalReclusosHistoricos = carcel.estatus_penitenciario?.length || 0;
      
      return {
        ...carcel,
        reclusos_actuales: reclusosActuales,
        total_reclusos_historicos: totalReclusosHistoricos,
        estatus_penitenciario: undefined // Remover para limpiar respuesta
      };
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      carceles: carcelesConEstadisticas,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error obteniendo cárceles:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener cárcel por ID
const getCarcelById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: carcel, error } = await supabase
      .from('carcel')
      .select(`
        *,
        estatus_penitenciario(
          id,
          id_delincuente,
          id_celda,
          fecha_ingreso,
          fecha_salida_programada,
          fecha_salida_real,
          delincuente:id_delincuente(
            id,
            persona:id_persona(
              nombre,
              apellido_paterno,
              apellido_materno
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Cárcel no encontrada',
          code: 'PRISON_NOT_FOUND'
        });
      }
      console.error('Error obteniendo cárcel:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Procesar datos para estadísticas
    const reclusosActuales = carcel.estatus_penitenciario?.filter(ep => !ep.fecha_salida_real) || [];
    const totalReclusosHistoricos = carcel.estatus_penitenciario?.length || 0;
    const celdasOcupadas = [...new Set(reclusosActuales.map(ep => ep.id_celda))].length;
    const totalCeldas = [...new Set(carcel.estatus_penitenciario?.map(ep => ep.id_celda) || [])].length;

    const carcelConEstadisticas = {
      ...carcel,
      estadisticas: {
        reclusos_actuales: reclusosActuales.length,
        total_reclusos_historicos: totalReclusosHistoricos,
        celdas_ocupadas: celdasOcupadas,
        total_celdas: totalCeldas
      },
      reclusos_actuales: reclusosActuales.map(ep => ({
        ...ep,
        nombre_completo: ep.delincuente?.persona ? 
          `${ep.delincuente.persona.nombre} ${ep.delincuente.persona.apellido_paterno} ${ep.delincuente.persona.apellido_materno}`.trim() : 
          'N/A'
      }))
    };

    res.json(carcelConEstadisticas);

  } catch (error) {
    console.error('Error obteniendo cárcel por ID:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nueva cárcel
const createCarcel = async (req, res) => {
  try {
    const { nombre_oficial, apodo, ubicacion } = req.body;

    // Validar campos requeridos
    if (!nombre_oficial) {
      return res.status(400).json({
        error: 'El nombre oficial es requerido',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar que no exista una cárcel con el mismo nombre
    const { data: existingCarcel, error: checkError } = await supabase
      .from('carcel')
      .select('id')
      .eq('nombre_oficial', nombre_oficial)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error verificando cárcel existente:', checkError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    if (existingCarcel) {
      return res.status(409).json({
        error: 'Ya existe una cárcel con este nombre oficial',
        code: 'PRISON_NAME_EXISTS'
      });
    }

    const { data: nuevaCarcel, error } = await supabase
      .from('carcel')
      .insert({
        nombre_oficial,
        apodo,
        ubicacion
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando cárcel:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    res.status(201).json({
      message: 'Cárcel creada exitosamente',
      carcel: nuevaCarcel
    });

  } catch (error) {
    console.error('Error creando cárcel:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Actualizar cárcel
const updateCarcel = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que la cárcel existe
    const { data: existingCarcel, error: checkError } = await supabase
      .from('carcel')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Cárcel no encontrada',
          code: 'PRISON_NOT_FOUND'
        });
      }
      console.error('Error verificando cárcel:', checkError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Verificar duplicado de nombre si se está actualizando
    if (updates.nombre_oficial) {
      const { data: duplicateCarcel, error: duplicateError } = await supabase
        .from('carcel')
        .select('id')
        .eq('nombre_oficial', updates.nombre_oficial)
        .neq('id', id)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        console.error('Error verificando duplicado:', duplicateError);
        return res.status(500).json({
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        });
      }

      if (duplicateCarcel) {
        return res.status(409).json({
          error: 'Ya existe otra cárcel con este nombre oficial',
          code: 'PRISON_NAME_EXISTS'
        });
      }
    }

    // Filtrar campos válidos para actualizar
    const validFields = ['nombre_oficial', 'apodo', 'ubicacion'];
    const updateData = {};
    
    Object.keys(updates).forEach(key => {
      if (validFields.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No hay campos válidos para actualizar',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    const { data: carcelActualizada, error } = await supabase
      .from('carcel')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando cárcel:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    res.json({
      message: 'Cárcel actualizada exitosamente',
      carcel: carcelActualizada
    });

  } catch (error) {
    console.error('Error actualizando cárcel:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Eliminar cárcel
const deleteCarcel = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la cárcel existe
    const { data: existingCarcel, error: checkError } = await supabase
      .from('carcel')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Cárcel no encontrada',
          code: 'PRISON_NOT_FOUND'
        });
      }
      console.error('Error verificando cárcel:', checkError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Verificar si tiene historial penitenciario
    const { data: historial, error: historialError } = await supabase
      .from('estatus_penitenciario')
      .select('id_carcel')
      .eq('id_carcel', id)
      .limit(1)
      .single();

    if (historialError && historialError.code !== 'PGRST116') {
      console.error('Error verificando historial:', historialError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    if (historial) {
      return res.status(400).json({
        error: 'No se puede eliminar la cárcel porque tiene historial de reclusos',
        code: 'HAS_PRISONER_HISTORY'
      });
    }

    const { error } = await supabase
      .from('carcel')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando cárcel:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    res.json({
      message: 'Cárcel eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando cárcel:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener estadísticas generales de cárceles
const getEstadisticas = async (req, res) => {
  try {
    // Total de cárceles
    const { count: totalCarceles, error: countError } = await supabase
      .from('carcel')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error contando cárceles:', countError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Ocupación por cárcel
    const { data: ocupacionData, error: ocupacionError } = await supabase
      .from('carcel')
      .select(`
        nombre_oficial,
        apodo,
        estatus_penitenciario(
          id_delincuente,
          fecha_salida_real
        )
      `);

    if (ocupacionError) {
      console.error('Error obteniendo ocupación:', ocupacionError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Procesar datos de ocupación
    const ocupacionPorCarcel = ocupacionData.map(carcel => {
      const totalReclusosHistoricos = carcel.estatus_penitenciario?.length || 0;
      const reclusosActuales = carcel.estatus_penitenciario?.filter(ep => !ep.fecha_salida_real).length || 0;
      
      return {
        nombre_oficial: carcel.nombre_oficial,
        apodo: carcel.apodo,
        total_reclusos_historicos: totalReclusosHistoricos,
        reclusos_actuales: reclusosActuales
      };
    }).sort((a, b) => b.reclusos_actuales - a.reclusos_actuales);

    // Celdas por cárcel
    const { data: celdasData, error: celdasError } = await supabase
      .from('carcel')
      .select(`
        nombre_oficial,
        estatus_penitenciario(
          id_celda,
          fecha_salida_real
        )
      `);

    if (celdasError) {
      console.error('Error obteniendo celdas:', celdasError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Procesar datos de celdas
    const celdasPorCarcel = celdasData.map(carcel => {
      const todasLasCeldas = carcel.estatus_penitenciario?.map(ep => ep.id_celda) || [];
      const celdasActuales = carcel.estatus_penitenciario?.filter(ep => !ep.fecha_salida_real).map(ep => ep.id_celda) || [];
      
      const totalCeldas = [...new Set(todasLasCeldas)].length;
      const celdasOcupadas = [...new Set(celdasActuales)].length;
      
      return {
        nombre_oficial: carcel.nombre_oficial,
        total_celdas: totalCeldas,
        celdas_ocupadas: celdasOcupadas
      };
    }).sort((a, b) => b.total_celdas - a.total_celdas);

    // Distribución geográfica
    const { data: ubicacionesData, error: ubicacionesError } = await supabase
      .from('carcel')
      .select(`
        ubicacion,
        estatus_penitenciario(
          fecha_salida_real
        )
      `)
      .not('ubicacion', 'is', null);

    if (ubicacionesError) {
      console.error('Error obteniendo ubicaciones:', ubicacionesError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }

    // Procesar distribución geográfica
    const ubicacionesMap = {};
    ubicacionesData.forEach(carcel => {
      if (!ubicacionesMap[carcel.ubicacion]) {
        ubicacionesMap[carcel.ubicacion] = {
          ubicacion: carcel.ubicacion,
          total_carceles: 0,
          total_reclusos_actuales: 0
        };
      }
      ubicacionesMap[carcel.ubicacion].total_carceles++;
      const reclusosActuales = carcel.estatus_penitenciario?.filter(ep => !ep.fecha_salida_real).length || 0;
      ubicacionesMap[carcel.ubicacion].total_reclusos_actuales += reclusosActuales;
    });

    const distribucionGeografica = Object.values(ubicacionesMap)
      .sort((a, b) => b.total_carceles - a.total_carceles);

    // Calcular totales
    const totalReclusosActuales = ocupacionPorCarcel.reduce((sum, c) => sum + c.reclusos_actuales, 0);

    res.json({
      resumen: {
        totalCarceles: totalCarceles || 0,
        totalReclusosActuales
      },
      ocupacionPorCarcel,
      celdasPorCarcel,
      distribucionGeografica
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de cárceles:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getCarceles,
  getCarcelById,
  createCarcel,
  updateCarcel,
  deleteCarcel,
  getEstadisticas
};