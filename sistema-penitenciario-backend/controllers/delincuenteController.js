const { supabase } = require('../src/config/database');

// Obtener todos los delincuentes con paginación
const getDelincuentes = async (req, res) => {
  try {

    
    const { page = 1, limit = 1000, search = '', sortBy = 'id_persona', sortOrder = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    // Validar campos de ordenamiento
    const validSortFields = ['id_persona', 'fecha_alta_delincuente', 'alias'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'id_persona';
    const ascending = sortOrder.toLowerCase() !== 'desc';



    // Construir query base
    let query = supabase
      .from('delincuente')
      .select(`
        id_persona,
        fecha_alta_delincuente,
        alias,
        antecedentes,
        fecha_detencion,
        lugar_detencion,
        persona!inner(
          nombre,
          apellido_paterno,
          apellido_materno,
          fecha_de_nacimiento,
          fecha_de_fin
        )
      `, { count: 'exact' });

    // Aplicar búsqueda si existe
    if (search) {
      query = query.or(`alias.ilike.%${search}%,persona.nombre.ilike.%${search}%,persona.apellido_paterno.ilike.%${search}%,persona.apellido_materno.ilike.%${search}%`);

    }

    // Aplicar ordenamiento y paginación
    query = query
      .order(sortField, { ascending })
      .range(offset, offset + limit - 1);

    const { data: delincuentes, error, count } = await query;

    if (error) throw error;



    // Procesar datos para agregar campos calculados
    const delincuentesProcessed = await Promise.all(delincuentes.map(async (delincuente) => {
      const persona = delincuente.persona;
      
      // Calcular edad
      const fechaNacimiento = new Date(persona.fecha_de_nacimiento);
      const fechaReferencia = persona.fecha_de_fin ? new Date(persona.fecha_de_fin) : new Date();
      const edad = Math.floor((fechaReferencia - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000));

      // Obtener estatus penitenciario actual - CORREGIDO
      const { data: estatus, error: estatusError } = await supabase
        .from('estatus_penitenciario')
        .select(`
          fecha_salida_real,
          id_carcel,
          id_celda,
          fecha_ingreso,
          fecha_salida_prevista
        `)
        .eq('id_delincuente', delincuente.id_persona)
        .is('fecha_salida_real', null)
        .maybeSingle(); // ← Cambiar de .single() a .maybeSingle()



      // Si hay estatus, obtener el nombre de la cárcel
      let nombreCarcel = null;
      if (estatus && !estatusError) {
        const { data: carcelData } = await supabase
          .from('carcel')
          .select('nombre_oficial')
          .eq('id', estatus.id_carcel)
          .single();
        nombreCarcel = carcelData?.nombre_oficial;
      }
      
      // Contar crímenes asociados
      const { count: totalCrimenes } = await supabase
        .from('delincuente_crimen')
        .select('*', { count: 'exact', head: true })
        .eq('id_delincuente', delincuente.id_persona);

      return {
        ...delincuente,
        nombre: persona.nombre,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno,
        fecha_de_nacimiento: persona.fecha_de_nacimiento,
        fecha_de_fin: persona.fecha_de_fin,
        edad,
        estado_actual: (estatus && !estatusError) ? 'Recluido' : 'Libre', // ← CORREGIR ESTA LÍNEA
        carcel_actual: nombreCarcel,
        celda_actual: estatus?.id_celda || null,
        fecha_ingreso_actual: estatus?.fecha_ingreso || null,
        fecha_salida_prevista: estatus?.fecha_salida_prevista || null,
        total_crimenes: totalCrimenes || 0
      };
    }));

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const responseData = {
      delincuentes: delincuentesProcessed,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit: parseInt(limit)
      }
    };



    res.json(responseData);

  } catch (error) {
    console.error('❌ [DELINCUENTE] Error en getDelincuentes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener un delincuente por ID con información completa
const getDelincuenteById = async (req, res) => {
  try {
    const { id } = req.params;


    // Información básica del delincuente
    const { data: delincuente, error: delincuenteError } = await supabase
      .from('delincuente')
      .select(`
        *,
        persona!inner(
          nombre,
          apellido_paterno,
          apellido_materno,
          fecha_de_nacimiento,
          fecha_de_fin
        )
      `)
      .eq('id_persona', id)
      .single();

    if (delincuenteError || !delincuente) {

      return res.status(404).json({
        error: 'Delincuente no encontrado',
        code: 'DELINQUENT_NOT_FOUND'
      });
    }



    // Calcular edad
    const persona = delincuente.persona;
    const fechaNacimiento = new Date(persona.fecha_de_nacimiento);
    const fechaReferencia = persona.fecha_de_fin ? new Date(persona.fecha_de_fin) : new Date();
    const edad = Math.floor((fechaReferencia - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000));

    // Historial de crímenes
    const { data: crimenes, error: crimenesError } = await supabase
      .from('delincuente_crimen')
      .select(`
        fecha_participacion,
        rol,
        crimen!inner(
          id,
          descripcion,
          fecha_ocurrencia,
          ubicacion
        )
      `)
      .eq('id_delincuente', id)
      .order('crimen.fecha_ocurrencia', { ascending: false });

    // Historial penitenciario completo - CORREGIDO
    const { data: historial, error: historialError } = await supabase
      .from('estatus_penitenciario')
      .select('*')
      .eq('id_delincuente', delincuente.id_persona)
      .order('fecha_ingreso', { ascending: false });

    // AGREGAR ESTA CONSULTA DE VERIFICACIÓN TEMPORAL
    const { data: todosLosRegistros, error: errorTodos } = await supabase
      .from('estatus_penitenciario')
      .select('*')
      .eq('id_delincuente', delincuente.id_persona);
    






    // Procesar historial para agregar estado del período y información de cárcel
    let historialProcessed = [];
    if (historial && historial.length > 0) {
      historialProcessed = await Promise.all(historial.map(async (h) => {
        // Obtener información de la cárcel por separado
        const { data: carcelData } = await supabase
          .from('carcel')
          .select('nombre_oficial, apodo, ubicacion')
          .eq('id', h.id_carcel)
          .single();

        return {
          ...h,
          nombre_carcel: carcelData?.nombre_oficial || "No especificada",
          apodo_carcel: carcelData?.apodo || null,
          ubicacion_carcel: carcelData?.ubicacion || null,
          estado_periodo: !h.fecha_salida_real ? 'Activo' : 
                         (new Date(h.fecha_salida_real) <= new Date(h.fecha_salida_prevista) ? 'Liberado a tiempo' : 'Liberado tardío')
        };
      }));
    }

    // Estatus actual - CORREGIDO: solo devolver estatus si realmente está activo
    const estatusActual = historialProcessed.find(h => h.fecha_salida_real === null) || null;



    // Estadísticas del delincuente
    const estadisticas = {
      totalCrimenes: crimenes?.length || 0,
      totalEncarcelamientos: historial?.length || 0,
      tiempoTotalEncarcelado: 0, // Se podría calcular
      estadoActual: estatusActual ? 'Recluido' : 'Libre',
      primeraDetencion: delincuente.fecha_detencion,
      ultimoIngreso: historialProcessed[0]?.fecha_ingreso || null
    };



    // Procesar crímenes
    const crimenesProcessed = crimenes?.map(c => ({
      id: c.crimen.id,
      descripcion: c.crimen.descripcion,
      fecha_ocurrencia: c.crimen.fecha_ocurrencia,
      ubicacion: c.crimen.ubicacion,
      fecha_participacion: c.fecha_participacion,
      rol: c.rol
    })) || [];

    const responseData = {
      delincuente: {
        ...delincuente,
        nombre: persona.nombre,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno,
        fecha_de_nacimiento: persona.fecha_de_nacimiento,
        fecha_de_fin: persona.fecha_de_fin,
        edad
      },
      crimenes: crimenesProcessed,
      historialPenitenciario: historialProcessed,
      estatusActual,
      estadisticas
    };



    res.json(responseData);

  } catch (error) {
    console.error('❌ [DELINCUENTE] Error en getDelincuenteById:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nuevo delincuente
const createDelincuente = async (req, res) => {
  try {
    const { 
      id_persona, 
      fecha_alta_delincuente, 
      alias, 
      antecedentes, 
      fecha_detencion, 
      lugar_detencion 
    } = req.body;

    // Verificar que la persona existe y no está fallecida
    const { data: persona, error: personaError } = await supabase
      .from('persona')
      .select('id, nombre, apellido_paterno, apellido_materno, fecha_de_fin')
      .eq('id', id_persona)
      .single();

    if (personaError || !persona) {

      return res.status(404).json({
        error: 'Persona no encontrada',
        code: 'PERSON_NOT_FOUND'
      });
    }

    if (persona.fecha_de_fin) {

      return res.status(400).json({
        error: 'No se puede registrar como delincuente a una persona fallecida',
        code: 'PERSON_DECEASED'
      });
    }

    // Verificar que no sea ya un delincuente
    const { data: existing, error: existingError } = await supabase
      .from('delincuente')
      .select('id_persona')
      .eq('id_persona', id_persona)
      .single();

    if (existing) {

      return res.status(409).json({
        error: 'La persona ya está registrada como delincuente',
        code: 'ALREADY_DELINQUENT'
      });
    }

    // Crear el delincuente
    const { data: nuevoDelincuente, error: createError } = await supabase
      .from('delincuente')
      .insert({
        id_persona,
        fecha_alta_delincuente,
        alias,
        antecedentes,
        fecha_detencion,
        lugar_detencion
      })
      .select()
      .single();

    if (createError) throw createError;

    const responseData = {
      message: 'Delincuente registrado exitosamente',
      delincuente: {
        ...nuevoDelincuente,
        nombre: persona.nombre,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno
      }
    };





    res.status(201).json(responseData);

  } catch (error) {
    console.error('❌ [DELINCUENTE] Error en createDelincuente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Actualizar delincuente
const updateDelincuente = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el delincuente existe
    const { data: existing, error: existsError } = await supabase
      .from('delincuente')
      .select('id_persona')
      .eq('id_persona', id)
      .single();

    if (existsError || !existing) {
      return res.status(404).json({
        error: 'Delincuente no encontrado',
        code: 'DELINQUENT_NOT_FOUND'
      });
    }

    // Remover id_persona de las actualizaciones
    const { id_persona, ...validUpdates } = updates;

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos para actualizar',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    // Actualizar el delincuente
    const { data: delincuenteActualizado, error: updateError } = await supabase
      .from('delincuente')
      .update(validUpdates)
      .eq('id_persona', id)
      .select(`
        *,
        persona!inner(
          nombre,
          apellido_paterno,
          apellido_materno
        )
      `)
      .single();

    if (updateError) throw updateError;

    res.json({
      message: 'Delincuente actualizado exitosamente',
      delincuente: {
        ...delincuenteActualizado,
        nombre: delincuenteActualizado.persona.nombre,
        apellido_paterno: delincuenteActualizado.persona.apellido_paterno,
        apellido_materno: delincuenteActualizado.persona.apellido_materno
      }
    });

  } catch (error) {
    console.error('Error actualizando delincuente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Eliminar delincuente (solo si no tiene registros dependientes)
const deleteDelincuente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el delincuente existe
    const { data: existing, error: existsError } = await supabase
      .from('delincuente')
      .select('id_persona')
      .eq('id_persona', id)
      .single();

    if (existsError || !existing) {
      return res.status(404).json({
        error: 'Delincuente no encontrado',
        code: 'DELINQUENT_NOT_FOUND'
      });
    }

    // Verificar si tiene crímenes asociados
    const { data: crimenes, error: crimenesError } = await supabase
      .from('delincuente_crimen')
      .select('id_delincuente')
      .eq('id_delincuente', id)
      .limit(1);

    if (crimenes && crimenes.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el delincuente porque tiene crímenes asociados',
        code: 'HAS_ASSOCIATED_CRIMES'
      });
    }

    // Verificar si tiene historial penitenciario
    const { data: historial, error: historialError } = await supabase
      .from('estatus_penitenciario')
      .select('id_delincuente')
      .eq('id_delincuente', id)
      .limit(1);

    if (historial && historial.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el delincuente porque tiene historial penitenciario',
        code: 'HAS_PENITENTIARY_HISTORY'
      });
    }

    // Eliminar el delincuente
    const { error: deleteError } = await supabase
      .from('delincuente')
      .delete()
      .eq('id_persona', id);

    if (deleteError) throw deleteError;

    res.json({
      message: 'Delincuente eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando delincuente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Asociar delincuente con crimen
const asociarCrimen = async (req, res) => {
  try {
    const { id } = req.params; // ID del delincuente
    const { id_crimen, fecha_participacion, rol } = req.body;

    // Verificar que el delincuente existe
    const { data: delincuente, error: delincuenteError } = await supabase
      .from('delincuente')
      .select('id_persona')
      .eq('id_persona', id)
      .single();

    if (delincuenteError || !delincuente) {
      return res.status(404).json({
        error: 'Delincuente no encontrado',
        code: 'DELINQUENT_NOT_FOUND'
      });
    }

    // Verificar que el crimen existe
    const { data: crimen, error: crimenError } = await supabase
      .from('crimen')
      .select('id')
      .eq('id', id_crimen)
      .single();

    if (crimenError || !crimen) {
      return res.status(404).json({
        error: 'Crimen no encontrado',
        code: 'CRIME_NOT_FOUND'
      });
    }

    // Verificar si ya existe la asociación
    const { data: existing, error: existingError } = await supabase
      .from('delincuente_crimen')
      .select('*')
      .eq('id_delincuente', id)
      .eq('id_crimen', id_crimen)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'El delincuente ya está asociado a este crimen',
        code: 'ASSOCIATION_EXISTS'
      });
    }

    // Crear la asociación
    const { data: asociacion, error: createError } = await supabase
      .from('delincuente_crimen')
      .insert({
        id_delincuente: id,
        id_crimen,
        fecha_participacion,
        rol
      })
      .select(`
        *,
        delincuente!inner(
          persona!inner(
            nombre,
            apellido_paterno,
            apellido_materno
          )
        ),
        crimen!inner(
          descripcion,
          fecha_ocurrencia,
          ubicacion
        )
      `)
      .single();

    if (createError) throw createError;

    res.status(201).json({
      message: 'Delincuente asociado al crimen exitosamente',
      asociacion: {
        ...asociacion,
        nombre: asociacion.delincuente.persona.nombre,
        apellido_paterno: asociacion.delincuente.persona.apellido_paterno,
        apellido_materno: asociacion.delincuente.persona.apellido_materno,
        descripcion_crimen: asociacion.crimen.descripcion,
        fecha_ocurrencia: asociacion.crimen.fecha_ocurrencia,
        ubicacion: asociacion.crimen.ubicacion
      }
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
const desasociarCrimen = async (req, res) => {
  try {
    const { id, crimen_id } = req.params;

    // Verificar que la asociación existe
    const { data: asociacion, error: asociacionError } = await supabase
      .from('delincuente_crimen')
      .select('*')
      .eq('id_delincuente', id)
      .eq('id_crimen', crimen_id)
      .single();

    if (asociacionError || !asociacion) {
      return res.status(404).json({
        error: 'Asociación no encontrada',
        code: 'ASSOCIATION_NOT_FOUND'
      });
    }

    // Eliminar la asociación
    const { error: deleteError } = await supabase
      .from('delincuente_crimen')
      .delete()
      .eq('id_delincuente', id)
      .eq('id_crimen', crimen_id);

    if (deleteError) throw deleteError;

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

// Buscar delincuentes con filtros avanzados
const searchDelincuentes = async (req, res) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      alias,
      fecha_alta_desde,
      fecha_alta_hasta,
      fecha_detencion_desde,
      fecha_detencion_hasta,
      estado_actual = 'todos', // 'libre', 'recluido', 'liberado', 'todos'
      tiene_antecedentes,
      lugar_detencion
    } = req.query;

    // Construir query base
    let query = supabase
      .from('delincuente')
      .select(`
        id_persona,
        fecha_alta_delincuente,
        alias,
        antecedentes,
        fecha_detencion,
        lugar_detencion,
        persona!inner(
          nombre,
          apellido_paterno,
          apellido_materno,
          fecha_de_nacimiento,
          fecha_de_fin
        )
      `);

    // Aplicar filtros de persona
    if (nombre) {
      query = query.ilike('persona.nombre', `%${nombre}%`);
    }

    if (apellido_paterno) {
      query = query.ilike('persona.apellido_paterno', `%${apellido_paterno}%`);
    }

    if (apellido_materno) {
      query = query.ilike('persona.apellido_materno', `%${apellido_materno}%`);
    }

    // Aplicar filtros de delincuente
    if (alias) {
      query = query.ilike('alias', `%${alias}%`);
    }

    if (fecha_alta_desde) {
      query = query.gte('fecha_alta_delincuente', fecha_alta_desde);
    }

    if (fecha_alta_hasta) {
      query = query.lte('fecha_alta_delincuente', fecha_alta_hasta);
    }

    if (fecha_detencion_desde) {
      query = query.gte('fecha_detencion', fecha_detencion_desde);
    }

    if (fecha_detencion_hasta) {
      query = query.lte('fecha_detencion', fecha_detencion_hasta);
    }

    if (lugar_detencion) {
      query = query.ilike('lugar_detencion', `%${lugar_detencion}%`);
    }

    if (tiene_antecedentes === 'true') {
      query = query.not('antecedentes', 'is', null).neq('antecedentes', '');
    } else if (tiene_antecedentes === 'false') {
      query = query.or('antecedentes.is.null,antecedentes.eq.');
    }

    // Ordenar resultados
    query = query.order('persona.apellido_paterno').order('persona.apellido_materno').order('persona.nombre');

    const { data: delincuentes, error } = await query;

    if (error) throw error;

    // Procesar datos para agregar campos calculados
    const delincuentesProcessed = await Promise.all(delincuentes.map(async (delincuente) => {
      const persona = delincuente.persona;
      
      // Calcular edad
      const fechaNacimiento = new Date(persona.fecha_de_nacimiento);
      const fechaReferencia = persona.fecha_de_fin ? new Date(persona.fecha_de_fin) : new Date();
      const edad = Math.floor((fechaReferencia - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000));

      // Obtener estado actual según filtro
      let estadoActual = 'Libre';
      let incluirEnResultados = true;

      if (estado_actual !== 'todos') {
        const { data: estatus } = await supabase
          .from('estatus_penitenciario')
          .select('fecha_salida_real, id_delincuente')
          .eq('id_delincuente', delincuente.id_persona)
          .order('fecha_ingreso', { ascending: false })
          .limit(1)
          .single();

        if (estatus) {
          estadoActual = estatus.fecha_salida_real ? 'Liberado' : 'Recluido';
        }

        // Filtrar según estado solicitado
        switch (estado_actual) {
          case 'libre':
            incluirEnResultados = !estatus;
            break;
          case 'recluido':
            incluirEnResultados = estatus && !estatus.fecha_salida_real;
            break;
          case 'liberado':
            incluirEnResultados = estatus && estatus.fecha_salida_real;
            break;
        }
      }

      if (!incluirEnResultados) return null;

      // Contar crímenes asociados
      const { count: totalCrimenes } = await supabase
        .from('delincuente_crimen')
        .select('*', { count: 'exact', head: true })
        .eq('id_delincuente', delincuente.id_persona);

      return {
        ...delincuente,
        nombre: persona.nombre,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno,
        fecha_de_nacimiento: persona.fecha_de_nacimiento,
        fecha_de_fin: persona.fecha_de_fin,
        edad,
        estado_actual: estadoActual,
        total_crimenes: totalCrimenes || 0
      };
    }));

    // Filtrar resultados nulos
    const resultadosFinales = delincuentesProcessed.filter(d => d !== null);

    res.json({
      delincuentes: resultadosFinales,
      total: resultadosFinales.length,
      filtros: {
        nombre,
        apellido_paterno,
        apellido_materno,
        alias,
        fecha_alta_desde,
        fecha_alta_hasta,
        fecha_detencion_desde,
        fecha_detencion_hasta,
        estado_actual,
        tiene_antecedentes,
        lugar_detencion
      }
    });

  } catch (error) {
    console.error('Error en búsqueda avanzada de delincuentes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener estadísticas de delincuentes
const getEstadisticas = async (req, res) => {
  try {

    
    // Total de delincuentes
    const { count: totalDelincuentes } = await supabase
      .from('delincuente')
      .select('*', { count: 'exact', head: true });

    // Delincuentes actualmente recluidos
    const { data: recluidos } = await supabase
      .from('estatus_penitenciario')
      .select('id_delincuente')
      .is('fecha_salida_real', null);

    const totalRecluidos = new Set(recluidos?.map(r => r.id_delincuente) || []).size;

    // Delincuentes libres
    const totalLibres = totalDelincuentes - totalRecluidos;



    // Delincuentes por rango de edad
    const { data: delincuentesConEdad } = await supabase
      .from('delincuente')
      .select(`
        id_persona,
        persona!inner(
          fecha_de_nacimiento,
          fecha_de_fin
        )
      `);

    const edadesProcesadas = delincuentesConEdad?.map(d => {
      const fechaNacimiento = new Date(d.persona.fecha_de_nacimiento);
      const fechaReferencia = d.persona.fecha_de_fin ? new Date(d.persona.fecha_de_fin) : new Date();
      const edad = Math.floor((fechaReferencia - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000));
      
      let rangoEdad = 'Más de 50';
      if (edad < 18) rangoEdad = 'Menor de edad';
      else if (edad <= 25) rangoEdad = '18-25';
      else if (edad <= 35) rangoEdad = '26-35';
      else if (edad <= 50) rangoEdad = '36-50';
      
      return { rango_edad: rangoEdad };
    }) || [];

    const porEdades = edadesProcesadas.reduce((acc, curr) => {
      acc[curr.rango_edad] = (acc[curr.rango_edad] || 0) + 1;
      return acc;
    }, {});

    const edadesArray = Object.entries(porEdades).map(([rango_edad, total]) => ({
      rango_edad,
      total
    }));

    // Top criminales (delincuentes con más crímenes)
    const { data: topCriminales } = await supabase
      .from('delincuente')
      .select(`
        id_persona,
        alias,
        persona!inner(
          nombre,
          apellido_paterno,
          apellido_materno
        ),
        delincuente_crimen(count)
      `)
      .order('delincuente_crimen.count', { ascending: false })
      .limit(10);

    const topCriminalesProcessed = topCriminales?.filter(d => d.delincuente_crimen?.[0]?.count > 0)
      .map(d => ({
        nombre: d.persona.nombre,
        apellido_paterno: d.persona.apellido_paterno,
        apellido_materno: d.persona.apellido_materno,
        alias: d.alias,
        total_crimenes: d.delincuente_crimen?.[0]?.count || 0
      })) || [];

    // Ingresos por mes en el último año
    const fechaLimite = new Date();
    fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);

    const { data: ingresosMensuales } = await supabase
      .from('delincuente')
      .select('fecha_alta_delincuente')
      .gte('fecha_alta_delincuente', fechaLimite.toISOString().split('T')[0]);

    const ingresosPorMes = ingresosMensuales?.reduce((acc, curr) => {
      const fecha = new Date(curr.fecha_alta_delincuente);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      acc[mes] = (acc[mes] || 0) + 1;
      return acc;
    }, {}) || {};

    const ingresosMensualesArray = Object.entries(ingresosPorMes)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    const responseData = {
      resumen: {
        total: totalDelincuentes || 0,
        recluidos: totalRecluidos,
        libres: totalLibres
      },
      porEdades: edadesArray,
      topCriminales: topCriminalesProcessed,
      ingresosMensuales: ingresosMensualesArray
    };



    res.json(responseData);

  } catch (error) {
    console.error('❌ [DELINCUENTE] Error en getEstadisticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getDelincuentes,
  getDelincuenteById,
  createDelincuente,
  updateDelincuente,
  deleteDelincuente,
  asociarCrimen,
  desasociarCrimen,
  searchDelincuentes,
  getEstadisticas
};