const { supabase } = require('../src/config/database');

// Obtener todas las personas con paginación
const getPersonas = async (req, res) => {
  try {
    const { page = 1, limit = 1000, search = '', sortBy = 'id', sortOrder = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    // Validar sortBy para evitar SQL injection
    const validSortFields = ['id', 'nombre', 'apellido_paterno', 'apellido_materno', 'fecha_de_nacimiento'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'id';
    const ascending = sortOrder.toLowerCase() !== 'desc';

    let query = supabase
      .from('persona')
      .select(`
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_de_nacimiento,
        fecha_de_fin,
        delincuente:delincuente(id_persona)
      `, { count: 'exact' });

    // Aplicar búsqueda si existe
    if (search) {
      query = query.or(`nombre.ilike.%${search}%,apellido_paterno.ilike.%${search}%,apellido_materno.ilike.%${search}%`);
    }

    // Aplicar ordenamiento y paginación
    query = query
      .order(sortField, { ascending })
      .range(offset, offset + limit - 1);

    const { data: personas, error, count } = await query;

    if (error) throw error;

    // Procesar datos para agregar campos calculados
    const personasProcessed = personas.map(persona => ({
      ...persona,
      estado: persona.fecha_de_fin ? 'Fallecido' : 'Vivo',
      es_delincuente: persona.delincuente && persona.delincuente.length > 0,
      edad: persona.fecha_de_fin 
        ? Math.floor((new Date(persona.fecha_de_fin) - new Date(persona.fecha_de_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
        : Math.floor((new Date() - new Date(persona.fecha_de_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
    }));

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      personas: personasProcessed,
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
    console.error('Error obteniendo personas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Obtener una persona por ID
const getPersonaById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: persona, error } = await supabase
      .from('persona')
      .select(`
        *,
        delincuente:delincuente(
          id_persona,
          fecha_alta_delincuente,
          alias,
          antecedentes,
          fecha_detencion,
          lugar_detencion
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Persona no encontrada',
          code: 'PERSON_NOT_FOUND'
        });
      }
      throw error;
    }

    // Agregar campos calculados
    const personaProcessed = {
      ...persona,
      estado: persona.fecha_de_fin ? 'Fallecido' : 'Vivo',
      es_delincuente: persona.delincuente && persona.delincuente.length > 0,
      edad: persona.fecha_de_fin 
        ? Math.floor((new Date(persona.fecha_de_fin) - new Date(persona.fecha_de_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
        : Math.floor((new Date() - new Date(persona.fecha_de_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
    };

    res.json(personaProcessed);

  } catch (error) {
    console.error('Error obteniendo persona:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Crear nueva persona
const createPersona = async (req, res) => {
  try {
    const personaData = req.body;

    // Validar campos requeridos
    if (!personaData.nombre || !personaData.apellido_paterno || !personaData.fecha_de_nacimiento) {
      return res.status(400).json({
        error: 'Nombre, apellido paterno y fecha de nacimiento son requeridos',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validar y convertir formato de fecha
    let fechaNacimiento = personaData.fecha_de_nacimiento;
    
    // Si la fecha viene en formato MM/DD/YYYY, convertir a YYYY-MM-DD
    if (typeof fechaNacimiento === 'string' && fechaNacimiento.includes('/')) {
      const fechaParts = fechaNacimiento.split('/');
      if (fechaParts.length === 3) {
        // MM/DD/YYYY -> YYYY-MM-DD
        const [mes, dia, año] = fechaParts;
        fechaNacimiento = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
    }

    // Validar que la fecha sea válida
    const fechaValidada = new Date(fechaNacimiento);
    if (isNaN(fechaValidada.getTime())) {
      return res.status(400).json({
        error: 'Formato de fecha inválido. Use YYYY-MM-DD o MM/DD/YYYY',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Filtrar solo los campos que existen en la tabla persona
    const { cedula, direccion, telefono, email, ...validPersonaData } = personaData;
    
    // Convertir fecha_de_fin a null si es un string vacío para Supabase
    if (validPersonaData.fecha_de_fin === '') {
      validPersonaData.fecha_de_fin = null;
    }

    // Actualizar la fecha con el formato correcto
    validPersonaData.fecha_de_nacimiento = fechaNacimiento;

    const { data: newPersona, error } = await supabase
      .from('persona')
      .insert(validPersonaData)
      .select()
      .single();

    if (error) {
      console.error('❌ [PERSONA] Error de Supabase:', error);
      throw error;
    }

    res.status(201).json({
      message: 'Persona creada exitosamente',
      persona: newPersona
    });

  } catch (error) {
    console.error('❌ [PERSONA] Error creando persona:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Actualizar persona
const updatePersona = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que la persona existe
    const { data: existingPersona, error: checkError } = await supabase
      .from('persona')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Persona no encontrada',
          code: 'PERSON_NOT_FOUND'
        });
      }
      throw checkError;
    }

    // Filtrar campos válidos y no vacíos
    const validFields = ['nombre', 'apellido_paterno', 'apellido_materno', 'fecha_de_nacimiento', 'fecha_de_fin'];
    const validUpdateData = {};

    validFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        const value = updateData[field];
        // Solo incluir si no es string vacío, pero permitir null para fecha_de_fin
        if (field === 'fecha_de_fin') {
          validUpdateData[field] = value === '' ? null : value;
        } else if (value !== '' && value !== null && value !== undefined) {
          validUpdateData[field] = value;
        }
      }
    });

    if (Object.keys(validUpdateData).length === 0) {
      return res.status(400).json({
        error: 'No hay campos válidos para actualizar',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    const { data: updatedPersona, error } = await supabase
      .from('persona')
      .update(validUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Persona actualizada exitosamente',
      persona: updatedPersona
    });

  } catch (error) {
    console.error('Error actualizando persona:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Función auxiliar para eliminar delincuente con todos sus registros asociados
const eliminarDelincuenteCompleto = async (idPersona) => {
  try {
    // 1. Eliminar asociaciones de crímenes
    const { error: crimenesError } = await supabase
      .from('delincuente_crimen')
      .delete()
      .eq('id_delincuente', idPersona);

    if (crimenesError) {
      console.error('❌ [CASCADE] Error eliminando crímenes asociados:', crimenesError);
      throw crimenesError;
    }

    // 2. Eliminar historial penitenciario
    const { error: historialError } = await supabase
      .from('estatus_penitenciario')
      .delete()
      .eq('id_delincuente', idPersona);

    if (historialError) {
      console.error('❌ [CASCADE] Error eliminando historial penitenciario:', historialError);
      throw historialError;
    }

    // 3. Eliminar delincuente
    const { error: delincuenteError } = await supabase
      .from('delincuente')
      .delete()
      .eq('id_persona', idPersona);

    if (delincuenteError) {
      console.error('❌ [CASCADE] Error eliminando delincuente:', delincuenteError);
      throw delincuenteError;
    }

    return { success: true, message: 'Delincuente y registros asociados eliminados exitosamente' };

  } catch (error) {
    console.error('❌ [CASCADE] Error en eliminación en cascada:', error);
    throw error;
  }
};

// Eliminar persona (con eliminación en cascada si es delincuente)
const deletePersona = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la persona existe
    const { data: persona, error: personaError } = await supabase
      .from('persona')
      .select('id, nombre, apellido_paterno, apellido_materno')
      .eq('id', id)
      .single();

    if (personaError || !persona) {
      return res.status(404).json({
        error: 'Persona no encontrada',
        code: 'PERSON_NOT_FOUND'
      });
    }

    // Verificar si la persona es un delincuente
    const { data: delincuente, error: delincuenteError } = await supabase
      .from('delincuente')
      .select('id_persona')
      .eq('id_persona', id)
      .single();

    if (delincuenteError && delincuenteError.code !== 'PGRST116') {
      console.error('❌ [PERSONA] Error verificando delincuente:', delincuenteError);
      throw delincuenteError;
    }

    // Si es delincuente, eliminar en cascada
    if (delincuente) {
      
      try {
        await eliminarDelincuenteCompleto(id);
      } catch (cascadeError) {
        console.error('❌ [PERSONA] Error en eliminación en cascada:', cascadeError);
        return res.status(500).json({
          error: 'Error eliminando registros asociados del delincuente',
          code: 'CASCADE_DELETE_ERROR'
        });
      }
    }

    // Eliminar la persona
    const { error: deleteError } = await supabase
      .from('persona')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [PERSONA] Error eliminando persona:', deleteError);
      throw deleteError;
    }

    const responseMessage = delincuente 
      ? 'Persona y todos sus registros asociados (delincuente, crímenes, historial penitenciario) eliminados exitosamente'
      : 'Persona eliminada exitosamente';

    res.json({
      message: responseMessage,
      eliminacionEnCascada: !!delincuente
    });

  } catch (error) {
    console.error('❌ [PERSONA] Error eliminando persona:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Buscar personas por término de búsqueda avanzada
const searchPersonas = async (req, res) => {
  try {
    const { 
      nombre, 
      apellido_paterno, 
      apellido_materno, 
      fecha_nacimiento_desde, 
      fecha_nacimiento_hasta,
      es_delincuente,
      estado = 'todos' // 'vivo', 'fallecido', 'todos'
    } = req.query;

    let query = supabase
      .from('persona')
      .select(`
        *,
        delincuente:delincuente(id_persona)
      `);

    // Aplicar filtros
    if (nombre) {
      query = query.ilike('nombre', `%${nombre}%`);
    }

    if (apellido_paterno) {
      query = query.ilike('apellido_paterno', `%${apellido_paterno}%`);
    }

    if (apellido_materno) {
      query = query.ilike('apellido_materno', `%${apellido_materno}%`);
    }

    if (fecha_nacimiento_desde) {
      query = query.gte('fecha_de_nacimiento', fecha_nacimiento_desde);
    }

    if (fecha_nacimiento_hasta) {
      query = query.lte('fecha_de_nacimiento', fecha_nacimiento_hasta);
    }

    if (estado === 'vivo') {
      query = query.is('fecha_de_fin', null);
    } else if (estado === 'fallecido') {
      query = query.not('fecha_de_fin', 'is', null);
    }

    const { data: personas, error } = await query;

    if (error) throw error;

    // Filtrar por es_delincuente después de la consulta
    let personasFiltradas = personas;
    if (es_delincuente === 'true') {
      personasFiltradas = personas.filter(p => p.delincuente && p.delincuente.length > 0);
    } else if (es_delincuente === 'false') {
      personasFiltradas = personas.filter(p => !p.delincuente || p.delincuente.length === 0);
    }

    // Procesar datos para agregar campos calculados
    const personasProcessed = personasFiltradas.map(persona => ({
      ...persona,
      estado: persona.fecha_de_fin ? 'Fallecido' : 'Vivo',
      es_delincuente: persona.delincuente && persona.delincuente.length > 0,
      edad: persona.fecha_de_fin 
        ? Math.floor((new Date(persona.fecha_de_fin) - new Date(persona.fecha_de_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
        : Math.floor((new Date() - new Date(persona.fecha_de_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
    }));

    res.json({
      personas: personasProcessed,
      total: personasProcessed.length
    });

  } catch (error) {
    console.error('Error en búsqueda de personas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  getPersonas,
  getPersonaById,
  createPersona,
  updatePersona,
  deletePersona,
  searchPersonas
};