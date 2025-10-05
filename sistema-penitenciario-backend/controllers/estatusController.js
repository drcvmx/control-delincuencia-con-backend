const { supabase } = require('../src/config/database');

// Obtener todos los estatus penitenciarios con paginación
const getEstatusPronitenciarios = async (req, res) => {
  try {
    
    
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      sortBy = 'fecha_ingreso', 
      sortOrder = 'desc',
      estado = 'todos' // 'activo', 'liberado', 'todos'
    } = req.query;
    const offset = (page - 1) * limit;

    // Validar campos de ordenamiento
    const validSortFields = ['fecha_ingreso', 'fecha_salida_prevista', 'fecha_salida_real', 'motivo_encarcelamiento'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'fecha_ingreso';
    const ascending = sortOrder.toLowerCase() === 'asc';


    // Construir query base
    let query = supabase
      .from('estatus_penitenciario')
      .select(`
        *,
        delincuente:id_delincuente (
          alias,
          persona:id_persona (
            id,
            nombre,
            apellido_paterno,
            apellido_materno,
            fecha_de_nacimiento,
            fecha_de_fin
          )
        ),
        carcel:id_carcel (
          id,
          nombre_oficial,
          apodo,
          ubicacion
        )
      `);

    // Aplicar filtros de búsqueda
    if (search) {
      query = query.or(`
        delincuente.persona.nombre.ilike.%${search}%,
        delincuente.persona.apellido_paterno.ilike.%${search}%,
        delincuente.persona.apellido_materno.ilike.%${search}%,
        delincuente.alias.ilike.%${search}%,
        motivo_encarcelamiento.ilike.%${search}%,
        carcel.nombre_oficial.ilike.%${search}%
      `);
    }

    // Aplicar filtro por estado
    if (estado === 'activo') {
      query = query.is('fecha_salida_real', null);
    } else if (estado === 'liberado') {
      query = query.not('fecha_salida_real', 'is', null);
    }

    // Contar total de registros
    const { count: totalRecords } = await query.select('*', { count: 'exact', head: true });

    // Aplicar ordenamiento y paginación
    query = query
      .order(sortField, { ascending })
      .range(offset, offset + limit - 1);

    const { data: estatusData, error } = await query;

    if (error) throw error;

    const totalPages = Math.ceil(totalRecords / limit);

    // Procesar datos para incluir campos calculados
    const estatus = estatusData.map(ep => {
      const persona = ep.delincuente?.persona;
      const carcel = ep.carcel;
      
      // Calcular edad
      const fechaNacimiento = persona?.fecha_de_nacimiento;
      const fechaFin = persona?.fecha_de_fin || new Date().toISOString();
      const edad = fechaNacimiento ? 
        Math.floor((new Date(fechaFin) - new Date(fechaNacimiento)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

      // Determinar estado del estatus
      let estadoEstatus;
      if (!ep.fecha_salida_real) {
        estadoEstatus = 'Activo';
      } else if (new Date(ep.fecha_salida_real) <= new Date(ep.fecha_salida_prevista)) {
        estadoEstatus = 'Liberado a tiempo';
      } else {
        estadoEstatus = 'Liberado tardío';
      }

      // Calcular días encarcelado
      const fechaFinal = ep.fecha_salida_real ? new Date(ep.fecha_salida_real) : new Date();
      const diasEncarcelado = Math.floor((fechaFinal - new Date(ep.fecha_ingreso)) / (24 * 60 * 60 * 1000));

      return {
        ...ep,
        nombre: persona?.nombre,
        apellido_paterno: persona?.apellido_paterno,
        apellido_materno: persona?.apellido_materno,
        alias: ep.delincuente?.alias,
        nombre_carcel: carcel?.nombre_oficial,
        apodo_carcel: carcel?.apodo,
        ubicacion_carcel: carcel?.ubicacion,
        edad_delincuente: edad,
        estado_estatus: estadoEstatus,
        dias_encarcelado: diasEncarcelado
      };
    });

    const responseData = {
      estatus,
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
    console.error('Error en getEstatusPronitenciarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener estatus por delincuente
const getEstatusByDelincuente = async (req, res) => {
  try {
    const { delincuente_id } = req.params;

    // Verificar que el delincuente existe
    const { data: delincuente, error: delincuenteError } = await supabase
      .from('delincuente')
      .select(`
        *,
        persona:id_persona (
          id,
          nombre,
          apellido_paterno,
          apellido_materno
        )
      `)
      .eq('id_persona', delincuente_id)
      .single();

    if (delincuenteError || !delincuente) {
      return res.status(404).json({
        error: 'Delincuente no encontrado',
        code: 'DELINQUENT_NOT_FOUND'
      });
    }

    // Obtener historial completo de estatus
    const { data: historialData, error: historialError } = await supabase
      .from('estatus_penitenciario')
      .select(`
        *,
        carcel:id_carcel (
          id,
          nombre_oficial,
          apodo,
          ubicacion
        )
      `)
      .eq('id_delincuente', delincuente_id)
      .order('fecha_ingreso', { ascending: false });

    if (historialError) throw historialError;

    // Procesar historial con campos calculados
    const historialPenitenciario = historialData.map(ep => {
      const carcel = ep.carcel;
      
      // Determinar estado del período
      let estadoPeriodo;
      if (!ep.fecha_salida_real) {
        estadoPeriodo = 'Activo';
      } else if (new Date(ep.fecha_salida_real) <= new Date(ep.fecha_salida_prevista)) {
        estadoPeriodo = 'Liberado a tiempo';
      } else {
        estadoPeriodo = 'Liberado tardío';
      }

      // Calcular días encarcelado
      const fechaFinal = ep.fecha_salida_real ? new Date(ep.fecha_salida_real) : new Date();
      const diasEncarcelado = Math.floor((fechaFinal - new Date(ep.fecha_ingreso)) / (24 * 60 * 60 * 1000));

      return {
        ...ep,
        nombre_carcel: carcel?.nombre_oficial,
        apodo_carcel: carcel?.apodo,
        ubicacion_carcel: carcel?.ubicacion,
        estado_periodo: estadoPeriodo,
        dias_encarcelado: diasEncarcelado
      };
    });

    // Estatus actual
    const estatusActual = historialPenitenciario.find(h => h.fecha_salida_real === null) || null;

    // Estadísticas del delincuente
    const totalDiasEncarcelado = historialPenitenciario.reduce((total, periodo) => {
      return total + (periodo.dias_encarcelado || 0);
    }, 0);

    const carcelesVisitadas = [...new Set(historialPenitenciario.map(h => h.nombre_carcel))];

    const estadisticas = {
      totalPeriodos: historialPenitenciario.length,
      totalDiasEncarcelado,
      carcelesVisitadas: carcelesVisitadas.length,
      estadoActual: estatusActual ? 'Recluido' : 'Libre',
      ultimoIngreso: historialPenitenciario[0]?.fecha_ingreso || null,
      ultimaLiberacion: historialPenitenciario.find(h => h.fecha_salida_real)?.fecha_salida_real || null
    };

    const responseData = {
      delincuente: {
        ...delincuente,
        ...delincuente.persona
      },
      historialPenitenciario,
      estatusActual,
      estadisticas
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error en getEstatusByDelincuente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nuevo estatus penitenciario (ingreso a prisión)
const createEstatus = async (req, res) => {
  try {
    const {
      id_delincuente,
      id_carcel,
      id_celda,
      fecha_ingreso,
      fecha_salida_prevista,
      motivo_encarcelamiento
    } = req.body;

    // Validar campos requeridos
    if (!id_delincuente || !id_carcel || !id_celda || !fecha_ingreso || !motivo_encarcelamiento) {
      return res.status(400).json({
        error: 'Todos los campos son requeridos excepto fecha_salida_prevista',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar que el delincuente existe
    const { data: delincuenteExists, error: delincuenteError } = await supabase
      .from('delincuente')
      .select('id_persona')
      .eq('id_persona', id_delincuente)
      .single();

    if (delincuenteError || !delincuenteExists) {
      return res.status(404).json({
        error: 'Delincuente no encontrado',
        code: 'DELINQUENT_NOT_FOUND'
      });
    }

    // Verificar que la cárcel existe
    const { data: carcelExists, error: carcelError } = await supabase
      .from('carcel')
      .select('id')
      .eq('id', id_carcel)
      .single();

    if (carcelError || !carcelExists) {
      return res.status(404).json({
        error: 'Cárcel no encontrada',
        code: 'PRISON_NOT_FOUND'
      });
    }

    // Verificar que el delincuente no esté ya recluido
    const { data: estatusActivo, error: estatusError } = await supabase
      .from('estatus_penitenciario')
      .select('id_delincuente')
      .eq('id_delincuente', id_delincuente)
      .is('fecha_salida_real', null);

    if (estatusError) throw estatusError;

    if (estatusActivo && estatusActivo.length > 0) {
      return res.status(409).json({
        error: 'El delincuente ya está actualmente recluido',
        code: 'ALREADY_IMPRISONED'
      });
    }

    // Verificar que la celda no esté ocupada
    const { data: celdaOcupada, error: celdaError } = await supabase
      .from('estatus_penitenciario')
      .select('id_delincuente')
      .eq('id_carcel', id_carcel)
      .eq('id_celda', id_celda)
      .is('fecha_salida_real', null);

    if (celdaError) throw celdaError;

    if (celdaOcupada && celdaOcupada.length > 0) {
      return res.status(409).json({
        error: 'La celda ya está ocupada',
        code: 'CELL_OCCUPIED'
      });
    }

    // Crear el estatus penitenciario
    const { data: nuevoEstatus, error: createError } = await supabase
      .from('estatus_penitenciario')
      .insert({
        id_delincuente,
        id_carcel,
        id_celda,
        fecha_ingreso,
        fecha_salida_prevista,
        motivo_encarcelamiento
      })
      .select()
      .single();

    if (createError) throw createError;

    // Obtener información completa para la respuesta
    const { data: estatusCompleto, error: completoError } = await supabase
      .from('estatus_penitenciario')
      .select(`
        *,
        delincuente!estatus_penitenciario_id_delincuente_fkey (
          alias,
          persona!delincuente_id_persona_fkey (
            nombre,
            apellido_paterno,
            apellido_materno
          )
        )
      `)
      .eq('id_delincuente', id_delincuente)
      .is('fecha_salida_real', null)
      .single();

    // Obtener información de la cárcel por separado (ya que no hay foreign key)
    let carcelInfo = null;
    if (estatusCompleto && estatusCompleto.id_carcel) {
      const { data: carcelData } = await supabase
        .from('carcel')
        .select('nombre_oficial, apodo')
        .eq('id', estatusCompleto.id_carcel)
        .single();
      carcelInfo = carcelData;
    }

    if (completoError) throw completoError;

    const resultado = {
      ...estatusCompleto,
      nombre: estatusCompleto.delincuente?.persona?.nombre,
      apellido_paterno: estatusCompleto.delincuente?.persona?.apellido_paterno,
      apellido_materno: estatusCompleto.delincuente?.persona?.apellido_materno,
      alias: estatusCompleto.delincuente?.alias,
      nombre_carcel: carcelInfo?.nombre_oficial,
      apodo_carcel: carcelInfo?.apodo
    };

    const responseData = {
      message: 'Estatus penitenciario creado exitosamente',
      estatus: resultado
    };

    res.status(201).json(responseData);

  } catch (error) {
    console.error('Error en createEstatus:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Actualizar estatus penitenciario
const updateEstatus = async (req, res) => {
  try {
    const { delincuente_id } = req.params;
    const updates = req.body;

    // Verificar que existe un estatus activo para el delincuente
    const { data: estatusActivo, error: estatusError } = await supabase
      .from('estatus_penitenciario')
      .select('*')
      .eq('id_delincuente', delincuente_id)
      .is('fecha_salida_real', null)
      .single();

    if (estatusError || !estatusActivo) {
      return res.status(404).json({
        error: 'No se encontró estatus penitenciario activo para el delincuente',
        code: 'ACTIVE_STATUS_NOT_FOUND'
      });
    }

    // Si se está cambiando la celda, verificar que esté disponible
    if (updates.id_celda && updates.id_celda !== estatusActivo.id_celda) {
      const { data: celdaOcupada, error: celdaError } = await supabase
        .from('estatus_penitenciario')
        .select('id_delincuente')
        .eq('id_carcel', estatusActivo.id_carcel)
        .eq('id_celda', updates.id_celda)
        .is('fecha_salida_real', null)
        .neq('id_delincuente', delincuente_id);

      if (celdaError) throw celdaError;

      if (celdaOcupada && celdaOcupada.length > 0) {
        return res.status(409).json({
          error: 'La celda ya está ocupada',
          code: 'CELL_OCCUPIED'
        });
      }
    }

    // Filtrar campos que no se pueden actualizar
    const allowedUpdates = { ...updates };
    delete allowedUpdates.id_delincuente;
    delete allowedUpdates.id_carcel;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos para actualizar',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    // Actualizar el estatus
    const { data: estatusActualizado, error: updateError } = await supabase
      .from('estatus_penitenciario')
      .update(allowedUpdates)
      .eq('id_delincuente', delincuente_id)
      .is('fecha_salida_real', null)
      .select()
      .single();

    if (updateError) throw updateError;

    // Obtener información completa para la respuesta
    const { data: estatusCompleto, error: completoError } = await supabase
      .from('estatus_penitenciario')
      .select(`
        *,
        delincuente!estatus_penitenciario_id_delincuente_fkey (
          alias,
          persona!delincuente_id_persona_fkey (
            nombre,
            apellido_paterno,
            apellido_materno
          )
        )
      `)
      .eq('id_delincuente', delincuente_id)
      .is('fecha_salida_real', null)
      .single();

    // Obtener información de la cárcel por separado (ya que no hay foreign key)
    let carcelInfo = null;
    if (estatusCompleto && estatusCompleto.id_carcel) {
      const { data: carcelData } = await supabase
        .from('carcel')
        .select('nombre_oficial, apodo')
        .eq('id', estatusCompleto.id_carcel)
        .single();
      carcelInfo = carcelData;
    }

    if (completoError) throw completoError;

    const resultado = {
      ...estatusCompleto,
      nombre: estatusCompleto.delincuente?.persona?.nombre,
      apellido_paterno: estatusCompleto.delincuente?.persona?.apellido_paterno,
      apellido_materno: estatusCompleto.delincuente?.persona?.apellido_materno,
      alias: estatusCompleto.delincuente?.alias,
      nombre_carcel: carcelInfo?.nombre_oficial,
      apodo_carcel: carcelInfo?.apodo
    };

    res.json({
      message: 'Estatus penitenciario actualizado exitosamente',
      estatus: resultado
    });

  } catch (error) {
    console.error('Error actualizando estatus penitenciario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Liberar delincuente (marcar fecha de salida real)
const liberarDelincuente = async (req, res) => {
  try {
    const { delincuente_id } = req.params;
    const { fecha_salida_real, notas_liberacion } = req.body;

    // Verificar que existe un estatus activo
    const { data: estatusActivo, error: estatusError } = await supabase
      .from('estatus_penitenciario')
      .select('*')
      .eq('id_delincuente', delincuente_id)
      .is('fecha_salida_real', null)
      .single();

    if (estatusError || !estatusActivo) {
      return res.status(404).json({
        error: 'No se encontró estatus penitenciario activo para el delincuente',
        code: 'ACTIVE_STATUS_NOT_FOUND'
      });
    }

    const fechaSalida = fecha_salida_real || new Date().toISOString().split('T')[0];

    // Validar que la fecha de salida no sea anterior al ingreso
    if (new Date(fechaSalida) < new Date(estatusActivo.fecha_ingreso)) {
      return res.status(400).json({
        error: 'La fecha de salida no puede ser anterior a la fecha de ingreso',
        code: 'INVALID_RELEASE_DATE'
      });
    }

    // Actualizar con fecha de salida
    const updateData = { fecha_salida_real: fechaSalida };
    if (notas_liberacion) {
      updateData.notas_liberacion = notas_liberacion;
    }

    const { data: estatusLiberado, error: updateError } = await supabase
      .from('estatus_penitenciario')
      .update(updateData)
      .eq('id_delincuente', delincuente_id)
      .is('fecha_salida_real', null)
      .select()
      .single();

    if (updateError) throw updateError;

    // Obtener información completa para la respuesta
    const { data: estatusCompleto, error: completoError } = await supabase
      .from('estatus_penitenciario')
      .select(`
        *,
        delincuente:id_delincuente (
          alias,
          persona:id_persona (
            nombre,
            apellido_paterno,
            apellido_materno
          )
        ),
        carcel:id_carcel (
          nombre_oficial,
          apodo
        )
      `)
      .eq('id_delincuente', delincuente_id)
      .eq('fecha_salida_real', fechaSalida)
      .single();

    if (completoError) throw completoError;

    // Calcular campos adicionales
    const tipoLiberacion = new Date(fechaSalida) <= new Date(estatusCompleto.fecha_salida_prevista) 
      ? 'Liberado a tiempo' 
      : 'Liberado tardío';
    
    const diasEncarcelado = Math.floor(
      (new Date(fechaSalida) - new Date(estatusCompleto.fecha_ingreso)) / (24 * 60 * 60 * 1000)
    );

    const resultado = {
      ...estatusCompleto,
      nombre: estatusCompleto.delincuente?.persona?.nombre,
      apellido_paterno: estatusCompleto.delincuente?.persona?.apellido_paterno,
      apellido_materno: estatusCompleto.delincuente?.persona?.apellido_materno,
      alias: estatusCompleto.delincuente?.alias,
      nombre_carcel: estatusCompleto.carcel?.nombre_oficial,
      apodo_carcel: estatusCompleto.carcel?.apodo,
      tipo_liberacion: tipoLiberacion,
      dias_encarcelado: diasEncarcelado
    };

    const responseData = {
      message: 'Delincuente liberado exitosamente',
      estatus: resultado
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error liberando delincuente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener estadísticas de estatus penitenciarios
const getEstadisticas = async (req, res) => {
  try {
    
    // Reclusos actuales
    const { count: reclusosActuales, error: reclusosError } = await supabase
      .from('estatus_penitenciario')
      .select('*', { count: 'exact', head: true })
      .is('fecha_salida_real', null);

    if (reclusosError) throw reclusosError;

    // Liberaciones por mes en el último año
    const fechaLimite = new Date();
    fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);

    const { data: liberacionesData, error: liberacionesError } = await supabase
      .from('estatus_penitenciario')
      .select('fecha_salida_real, fecha_salida_prevista')
      .not('fecha_salida_real', 'is', null)
      .gte('fecha_salida_real', fechaLimite.toISOString().split('T')[0]);

    if (liberacionesError) throw liberacionesError;

    // Procesar liberaciones por mes
    const liberacionesPorMes = {};
    liberacionesData.forEach(lib => {
      const mes = lib.fecha_salida_real.substring(0, 7); // YYYY-MM
      if (!liberacionesPorMes[mes]) {
        liberacionesPorMes[mes] = {
          mes,
          total_liberaciones: 0,
          liberaciones_tiempo: 0,
          liberaciones_tardias: 0
        };
      }
      liberacionesPorMes[mes].total_liberaciones++;
      
      if (new Date(lib.fecha_salida_real) <= new Date(lib.fecha_salida_prevista)) {
        liberacionesPorMes[mes].liberaciones_tiempo++;
      } else {
        liberacionesPorMes[mes].liberaciones_tardias++;
      }
    });

    const liberacionesMensuales = Object.values(liberacionesPorMes).sort((a, b) => a.mes.localeCompare(b.mes));

    // Ingresos por mes
    const { data: ingresosData, error: ingresosError } = await supabase
      .from('estatus_penitenciario')
      .select('fecha_ingreso')
      .gte('fecha_ingreso', fechaLimite.toISOString().split('T')[0]);

    if (ingresosError) throw ingresosError;

    // Procesar ingresos por mes
    const ingresosPorMes = {};
    ingresosData.forEach(ing => {
      const mes = ing.fecha_ingreso.substring(0, 7); // YYYY-MM
      if (!ingresosPorMes[mes]) {
        ingresosPorMes[mes] = { mes, total: 0 };
      }
      ingresosPorMes[mes].total++;
    });

    const ingresosMensuales = Object.values(ingresosPorMes).sort((a, b) => a.mes.localeCompare(b.mes));

    // Motivos de encarcelamiento más comunes
    const { data: motivosData, error: motivosError } = await supabase
      .from('estatus_penitenciario')
      .select('motivo_encarcelamiento, fecha_salida_real');

    if (motivosError) throw motivosError;

    // Procesar motivos
    const motivosPorTipo = {};
    motivosData.forEach(mot => {
      const motivo = mot.motivo_encarcelamiento;
      if (!motivosPorTipo[motivo]) {
        motivosPorTipo[motivo] = {
          motivo_encarcelamiento: motivo,
          total: 0,
          actuales: 0
        };
      }
      motivosPorTipo[motivo].total++;
      if (!mot.fecha_salida_real) {
        motivosPorTipo[motivo].actuales++;
      }
    });

    const motivosComunes = Object.values(motivosPorTipo)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Tiempo promedio de encarcelamiento
    const { data: tiemposData, error: tiemposError } = await supabase
      .from('estatus_penitenciario')
      .select('fecha_ingreso, fecha_salida_real')
      .not('fecha_salida_real', 'is', null);

    if (tiemposError) throw tiemposError;

    let promedioEncarcelamiento = 0;
    if (tiemposData.length > 0) {
      const totalDias = tiemposData.reduce((sum, periodo) => {
        const dias = Math.floor(
          (new Date(periodo.fecha_salida_real) - new Date(periodo.fecha_ingreso)) / (24 * 60 * 60 * 1000)
        );
        return sum + dias;
      }, 0);
      promedioEncarcelamiento = Math.round(totalDias / tiemposData.length);
    }

    const responseData = {
      resumen: {
        reclusosActuales: reclusosActuales || 0,
        promedioEncarcelamiento
      },
      liberacionesMensuales,
      ingresosMensuales,
      motivosComunes
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error en getEstadisticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getEstatusPronitenciarios,
  getEstatusByDelincuente,
  createEstatus,
  updateEstatus,
  liberarDelincuente,
  getEstadisticas
};