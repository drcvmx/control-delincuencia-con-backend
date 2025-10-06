# Guía de Despliegue en Vercel

## 📋 Requisitos Previos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Supabase](https://supabase.com) con base de datos configurada
- Repositorio Git (GitHub, GitLab, o Bitbucket)

## 🚀 Pasos para Desplegar

### 1. Preparar el Repositorio

```bash
# Inicializar git si no está inicializado
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Preparar para despliegue en Vercel"

# Conectar con tu repositorio remoto
git remote add origin https://github.com/tu-usuario/tu-repo.git

# Subir al repositorio
git push -u origin main
```

### 2. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel, ve a tu proyecto > Settings > Environment Variables y agrega:

#### Variables Requeridas:

```
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
DB_HOST=db.tu_proyecto.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=tu_password_de_supabase
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=24h
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
NODE_ENV=production
```

#### Variables Opcionales:

```
NEXT_PUBLIC_API_URL=
ALLOWED_ORIGINS=https://tu-app.vercel.app
NEXT_PUBLIC_APP_NAME=Sistema de Control de Delincuencia
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**Importante:** Deja `NEXT_PUBLIC_API_URL` vacío para que use rutas relativas en producción.

### 3. Desplegar en Vercel

#### Opción A: Desde el Dashboard de Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repositorio de Git
3. Vercel detectará automáticamente que es un proyecto Next.js
4. Haz clic en "Deploy"

#### Opción B: Desde la CLI

```bash
# Instalar Vercel CLI si no la tienes
npm i -g vercel

# Desplegar
vercel

# Para producción
vercel --prod
```

### 4. Configurar CORS en Producción

Una vez desplegado, actualiza la variable `ALLOWED_ORIGINS` con tu URL de Vercel:

```
ALLOWED_ORIGINS=https://tu-app.vercel.app,https://tu-app-preview.vercel.app
```

## 🔧 Configuración del Proyecto

### Estructura de Archivos Importantes

```
.
├── api/
│   └── index.js              # Handler para el backend Express
├── sistema-penitenciario-backend/
│   ├── app.js                # Aplicación Express
│   └── server.js             # Servidor (solo para desarrollo local)
├── vercel.json               # Configuración de Vercel
├── .env.local                # Variables locales (no subir a git)
└── .env.example              # Plantilla de variables
```

### vercel.json

El archivo `vercel.json` está configurado para:
- Redirigir todas las rutas `/api/*` al backend Express
- Servir el frontend Next.js en todas las demás rutas

## 🧪 Probar Localmente

### Desarrollo con Backend y Frontend Separados

Terminal 1 (Backend):
```bash
cd sistema-penitenciario-backend
npm start
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### Desarrollo con Vercel Dev (puede tener problemas con el body parser)

```bash
vercel dev
```

**Nota:** Si `vercel dev` da problemas, usa el método de terminales separadas.

## 📝 Notas Importantes

1. **Base de Datos**: Asegúrate de que Supabase esté configurado y las tablas creadas
2. **JWT Secret**: Usa un secret fuerte y único para producción
3. **CORS**: Actualiza `ALLOWED_ORIGINS` con tu dominio de producción
4. **Rate Limiting**: Ajusta según tus necesidades de tráfico

## 🐛 Solución de Problemas

### Error: "Failed to fetch"
- Verifica que `NEXT_PUBLIC_API_URL` esté vacío en producción
- Revisa que las variables de entorno estén configuradas en Vercel

### Error: "CORS policy"
- Actualiza `ALLOWED_ORIGINS` con tu dominio de Vercel
- Verifica que incluya tanto la URL de producción como las de preview

### Error: "Database connection failed"
- Verifica las credenciales de Supabase
- Asegúrate de que el `DB_HOST` sea correcto
- Revisa que Supabase permita conexiones desde Vercel

## 📚 Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
