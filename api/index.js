// api/index.js
const app = require("../sistema-penitenciario-backend/app.js");

// Handler para Vercel serverless
module.exports = async (req, res) => {
  try {
    console.log("🔵 API Handler - Inicio:", {
      method: req.method,
      url: req.url,
      path: req.query.path,
      headers: req.headers,
    });

    // Vercel agrega ?path= a la URL, necesitamos reconstruir la ruta correcta
    const path = req.query.path || "";

    // Reconstruir la URL original sin el parámetro path
    req.url = `/api/${path}`;

    // Eliminar el parámetro path del query
    delete req.query.path;

    // FIX: Crear un socket mock COMPLETO para que Express pueda obtener req.ip
    // En serverless no hay socket real, así que creamos uno falso muy completo
    const forwardedFor = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const ipAddress =
      (forwardedFor && forwardedFor.split(",")[0]?.trim()) || realIp || "127.0.0.1";

    // Crear objeto de conexión mock con TODAS las propiedades que Express/morgan esperan
    const mockConnection = {
      remoteAddress: ipAddress,
      remotePort: 443,
      localAddress: "127.0.0.1",
      localPort: 3000,
      encrypted: true,
      // Propiedades adicionales que algunos módulos pueden necesitar
      remoteFamily: "IPv4",
      localFamily: "IPv4",
      // Métodos que algunos módulos pueden llamar
      address: () => ({ address: ipAddress, family: "IPv4", port: 443 }),
      destroy: () => {},
      end: () => {},
    };

    // Asignar a TODAS las propiedades posibles que Express puede usar
    req.connection = mockConnection;
    req.socket = mockConnection;
    req.client = mockConnection;
    
    // IMPORTANTE: Sobrescribir req.ip directamente para evitar que Express lo calcule
    Object.defineProperty(req, "ip", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: ipAddress
    });

    // Si es POST, PUT o PATCH, leer el body
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        let bodyText = "";

        // Leer el body
        for await (const chunk of req) {
          bodyText += chunk;
        }

        console.log("🔵 Body recibido:", bodyText);

        // Parsear y agregar al req.body para que Express lo use
        if (bodyText) {
          req.body = JSON.parse(bodyText);
        }
      } catch (bodyError) {
        console.error("❌ Error leyendo body:", bodyError);
        return res.status(400).json({
          error: "Error parseando body",
          details: bodyError.message,
        });
      }
    }

    console.log("🔵 Pasando a Express...");

    // Pasar la request a Express
    return app(req, res);
  } catch (error) {
    console.error("❌ Error en API handler:", error);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      error: "Error interno del servidor",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Configuración para deshabilitar body parser de Next.js
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
