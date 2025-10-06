require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Importar configuración y middleware
const { testConnection } = require("./src/config/database");
const routes = require("./routes");

// Crear la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE DE SEGURIDAD
// =============================================================================

// Helmet para cabeceras de seguridad
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configurado
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"];

    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);

    // En producción, permitir dominios de Vercel automáticamente
    if (origin && origin.includes(".vercel.app")) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por política CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// Rate limiting global
const limiter = rateLimit({
  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo requests por ventana
  message: {
    error: "Demasiadas solicitudes desde esta IP",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: `${process.env.RATE_LIMIT_WINDOW || 15} minutos`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Configuración para serverless: obtener IP de headers en lugar de socket
  keyGenerator: (req) => {
    // Intentar obtener la IP de múltiples fuentes (compatible con serverless)
    return (
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "unknown"
    );
  },
  // Función para omitir el rate limiting en caso de error
  skip: (req) => {
    // Si no podemos obtener una IP válida, no aplicar rate limiting
    // (mejor permitir la petición que bloquear todo)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress;
    return !ip;
  },
});

app.use(limiter);

// =============================================================================
// MIDDLEWARE DE APLICACIÓN
// =============================================================================

// Compresión de respuestas
app.use(compression());

// Logging de requests
// Configurar morgan con token personalizado para IP (compatible con serverless)
morgan.token("real-ip", (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
});

if (process.env.NODE_ENV === "development") {
  // En desarrollo, usar formato simple con IP real
  app.use(morgan(":method :url :status :response-time ms - :real-ip"));
} else {
  // En producción, usar formato personalizado sin req.ip
  app.use(
    morgan(
      ":real-ip - :method :url :status :res[content-length] - :response-time ms"
    )
  );
}

// Parseo de JSON y URL encoded
// Solo parsear si el body no ha sido parseado ya (compatible con serverless)
app.use((req, res, next) => {
  // Si req.body ya existe (fue parseado en api/index.js), skip el parser
  if (req.body && Object.keys(req.body).length > 0) {
    return next();
  }
  // Si no, usar el parser normal de Express
  express.json({
    limit: "10mb",
    strict: true,
  })(req, res, next);
});

app.use((req, res, next) => {
  // Si req.body ya existe, skip el parser
  if (req.body && Object.keys(req.body).length > 0) {
    return next();
  }
  // Si no, usar el parser normal de Express
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })(req, res, next);
});

// Middleware para confiar en proxies (para obtener IP real)
app.set("trust proxy", 1);

// Middleware para agregar headers de respuesta comunes
app.use((req, res, next) => {
  res.setHeader("X-API-Version", "1.0.0");
  res.setHeader("X-Powered-By", "Sistema-Penitenciario-API");
  next();
});

// =============================================================================
// RUTAS
// =============================================================================

// Ruta de salud de la API
app.get("/health", async (req, res) => {
  const dbConnected = await testConnection();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    database: dbConnected ? "connected" : "disconnected",
    memory: process.memoryUsage(),
    version: "1.0.0",
  });
});

// Endpoint público para estadísticas del dashboard
app.get("/api/stats", async (req, res) => {
  try {
    const { supabase } = require("./src/config/database");

    // Obtener conteos básicos sin información sensible usando Supabase
    const [personasResult, delincuentesResult] = await Promise.all([
      supabase.from("persona").select("*", { count: "exact", head: true }),
      supabase.from("delincuente").select("*", { count: "exact", head: true }),
    ]);

    // Verificar errores
    if (personasResult.error) {
      console.error(
        "Error obteniendo conteo de personas:",
        personasResult.error
      );
    }
    if (delincuentesResult.error) {
      console.error(
        "Error obteniendo conteo de delincuentes:",
        delincuentesResult.error
      );
    }

    const stats = {
      personasCount: personasResult.count || 0,
      delincuentesCount: delincuentesResult.count || 0,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: "No se pudieron obtener las estadísticas",
    });
  }
});

// Rutas de la API
app.use("/api", routes);

// =============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// =============================================================================

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    code: "ROUTE_NOT_FOUND",
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
  // Obtener IP de forma segura (compatible con serverless)
  let clientIp = "127.0.0.1";
  try {
    clientIp =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      "127.0.0.1";
  } catch (e) {
    // Si falla obtener la IP, usar default
  }

  console.error("Error no manejado:", {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: clientIp,
    timestamp: new Date().toISOString(),
  });

  // Error de CORS
  if (error.message.includes("CORS")) {
    return res.status(403).json({
      error: "Acceso denegado por política CORS",
      code: "CORS_ERROR",
    });
  }

  // Error de JSON parsing
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "JSON inválido en el cuerpo de la petición",
      code: "INVALID_JSON",
    });
  }

  // Error de validación de Joi
  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Error de validación",
      code: "VALIDATION_ERROR",
      details: error.details,
    });
  }

  // Error de base de datos
  if (error.code && error.code.startsWith("23")) {
    // PostgreSQL errors
    let message = "Error de base de datos";
    let code = "DATABASE_ERROR";

    switch (error.code) {
      case "23505": // unique_violation
        message = "Ya existe un registro con estos datos";
        code = "DUPLICATE_ENTRY";
        break;
      case "23503": // foreign_key_violation
        message = "Referencia a registro inexistente";
        code = "FOREIGN_KEY_ERROR";
        break;
      case "23502": // not_null_violation
        message = "Campo requerido faltante";
        code = "REQUIRED_FIELD_MISSING";
        break;
    }

    return res.status(400).json({
      error: message,
      code: code,
    });
  }

  // Error genérico del servidor
  res.status(500).json({
    error: "Error interno del servidor",
    code: "INTERNAL_SERVER_ERROR",
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
