# Sistema de Control de Delincuencia

Sistema de gestión penitenciaria con frontend en Next.js y backend en Express.

## 🚀 Inicio Rápido

### Desarrollo Local

1. **Clonar el repositorio**
```bash
git clone <tu-repositorio>
cd control_delincuencia
```

2. **Instalar dependencias**
```bash
npm install
cd sistema-penitenciario-backend
npm install
cd ..
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

4. **Iniciar el proyecto**

Terminal 1 - Backend:
```bash
cd sistema-penitenciario-backend
npm start
```

Terminal 2 - Frontend:
```bash
npm run dev
```

5. **Abrir en el navegador**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## 📦 Despliegue en Vercel

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones detalladas.

### Resumen Rápido

1. Sube tu código a GitHub/GitLab/Bitbucket
2. Importa el proyecto en Vercel
3. Configura las variables de entorno en Vercel
4. Despliega

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: JWT
- **Despliegue**: Vercel

## 📁 Estructura del Proyecto

```
.
├── app/                      # Páginas de Next.js (App Router)
├── components/               # Componentes React
├── lib/                      # Utilidades y servicios
├── api/                      # Handler para Vercel serverless
├── sistema-penitenciario-backend/  # Backend Express
│   ├── app.js               # Aplicación Express
│   ├── server.js            # Servidor (desarrollo local)
│   ├── routes/              # Rutas del API
│   ├── controllers/         # Controladores
│   └── middleware/          # Middleware personalizado
├── vercel.json              # Configuración de Vercel
└── .env.local               # Variables de entorno (no subir a git)
```

## 🔐 Variables de Entorno

Ver `.env.example` para la lista completa de variables requeridas.

### Variables Principales

- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `DB_HOST`: Host de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `JWT_SECRET`: Secret para tokens JWT

## 📝 Scripts Disponibles

```bash
npm run dev          # Iniciar frontend en desarrollo
npm run build        # Construir para producción
npm start            # Iniciar en producción
npm run lint         # Ejecutar linter
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Autores

- Tu Nombre

## 🐛 Reportar Problemas

Si encuentras algún problema, por favor abre un issue en el repositorio.
