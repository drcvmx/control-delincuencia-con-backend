const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente de Supabase con service role para operaciones administrativas
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cliente de Supabase con clave anónima para operaciones normales
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Función para ejecutar queries usando Supabase (deprecada)
const query = async (text, params) => {
  console.log('⚠️  Query SQL directo no soportado con Supabase client:', text);
  console.log('📝 Parámetros:', params);
  throw new Error('Use las funciones específicas de Supabase en lugar de queries SQL directos');
};

// Función para transacciones (limitada en Supabase)
const transaction = async (callback) => {
  console.log('⚠️  Transacciones no soportadas directamente con Supabase client');
  console.log('💡 Sugerencia: Use operaciones individuales de Supabase o RPC functions');
  throw new Error('Use operaciones individuales de Supabase o funciones RPC para lógica compleja');
};

// Función para verificar la conexión
const testConnection = async () => {
  try {
    console.log('🔍 Verificando conexión a Supabase...');
    
    // Probar conexión con Supabase client
    const { data, error } = await supabase
      .from('usuario')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 es "tabla no encontrada"
      throw error;
    }
    
    console.log('✅ Conexión a Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message);
    return false;
  }
};

// Función helper para manejar errores de Supabase
const handleSupabaseError = (error, operation = 'operación') => {
  console.error(`Error en ${operation}:`, error);
  
  // Mapear códigos de error comunes
  const errorMap = {
    'PGRST116': 'Recurso no encontrado',
    'PGRST301': 'Datos duplicados',
    '23505': 'Violación de restricción única',
    '23503': 'Violación de clave foránea',
    '23502': 'Campo requerido faltante'
  };

  const message = errorMap[error.code] || error.message || 'Error desconocido';
  
  return {
    error: message,
    code: error.code || 'SUPABASE_ERROR',
    details: error.details || null
  };
};

// Función para crear filtros dinámicos
const buildFilters = (query, filters = {}) => {
  let filteredQuery = query;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'string' && value.includes('%')) {
        // Búsqueda con LIKE
        filteredQuery = filteredQuery.ilike(key, value);
      } else if (Array.isArray(value)) {
        // Filtro IN
        filteredQuery = filteredQuery.in(key, value);
      } else {
        // Filtro exacto
        filteredQuery = filteredQuery.eq(key, value);
      }
    }
  });

  return filteredQuery;
};

// Función para aplicar paginación estándar
const applyPagination = (query, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return query.range(offset, offset + parseInt(limit) - 1);
};

// Función para aplicar ordenamiento
const applyOrdering = (query, sortBy = 'id', sortOrder = 'asc') => {
  const ascending = sortOrder.toLowerCase() !== 'desc';
  return query.order(sortBy, { ascending });
};

module.exports = {
  // Clientes Supabase
  supabase,
  supabaseAdmin,
  
  // Funciones deprecadas (para compatibilidad)
  query,
  transaction,
  
  // Utilidades
  testConnection,
  handleSupabaseError,
  buildFilters,
  applyPagination,
  applyOrdering
};