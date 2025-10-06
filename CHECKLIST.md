# ✅ Checklist de Despliegue

## Antes de Subir a Git

- [ ] Verificar que `.env.local` NO esté en el repositorio
- [ ] Verificar que `node_modules` NO esté en el repositorio
- [ ] Verificar que `.next` NO esté en el repositorio
- [ ] Revisar que `.gitignore` esté configurado correctamente
- [ ] Crear `.env.example` con todas las variables necesarias
- [ ] Probar la aplicación localmente (backend + frontend)
- [ ] Verificar que el login funcione
- [ ] Verificar que todas las rutas del API funcionen

## Configuración de Vercel

- [ ] Crear cuenta en Vercel (si no tienes)
- [ ] Conectar repositorio de Git
- [ ] Configurar variables de entorno en Vercel:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `DB_HOST`
  - [ ] `DB_PORT`
  - [ ] `DB_NAME`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `JWT_SECRET`
  - [ ] `JWT_EXPIRES_IN`
  - [ ] `RATE_LIMIT_WINDOW`
  - [ ] `RATE_LIMIT_MAX_REQUESTS`
  - [ ] `NODE_ENV=production`
  - [ ] `NEXT_PUBLIC_API_URL=` (dejar vacío)

## Después del Primer Despliegue

- [ ] Obtener la URL de Vercel (ej: `https://tu-app.vercel.app`)
- [ ] Actualizar `ALLOWED_ORIGINS` en Vercel con la URL de producción
- [ ] Probar el login en producción
- [ ] Probar todas las funcionalidades principales
- [ ] Verificar que el API responda correctamente
- [ ] Revisar los logs en Vercel por errores

## Configuración de Base de Datos

- [ ] Verificar que Supabase esté activo
- [ ] Verificar que las tablas estén creadas
- [ ] Verificar que haya datos de prueba (si es necesario)
- [ ] Verificar que Supabase permita conexiones desde Vercel
- [ ] Configurar políticas de seguridad en Supabase

## Seguridad

- [ ] Cambiar `JWT_SECRET` a un valor fuerte y único
- [ ] Verificar que las contraseñas de BD sean seguras
- [ ] Revisar configuración de CORS
- [ ] Verificar rate limiting
- [ ] Revisar políticas de Supabase

## Testing en Producción

- [ ] Probar login con usuario de prueba
- [ ] Probar crear persona
- [ ] Probar editar persona
- [ ] Probar eliminar persona
- [ ] Probar búsqueda
- [ ] Probar estadísticas del dashboard
- [ ] Probar en diferentes navegadores
- [ ] Probar en dispositivos móviles

## Monitoreo

- [ ] Configurar alertas en Vercel
- [ ] Revisar logs regularmente
- [ ] Monitorear uso de recursos
- [ ] Configurar analytics (opcional)

## Documentación

- [ ] Actualizar README.md con URL de producción
- [ ] Documentar credenciales de acceso
- [ ] Documentar proceso de actualización
- [ ] Crear guía de usuario (opcional)

## Notas Importantes

### Variables que DEBEN estar vacías en producción:
- `NEXT_PUBLIC_API_URL` - Debe estar vacío para usar rutas relativas

### Variables que DEBEN actualizarse después del despliegue:
- `ALLOWED_ORIGINS` - Debe incluir tu dominio de Vercel

### Comandos útiles:

```bash
# Ver logs en tiempo real
vercel logs

# Ver información del despliegue
vercel inspect

# Revertir a un despliegue anterior
vercel rollback
```

## Solución Rápida de Problemas

### Si el login no funciona:
1. Verificar `NEXT_PUBLIC_API_URL` esté vacío
2. Verificar `JWT_SECRET` esté configurado
3. Revisar logs de Vercel

### Si hay error de CORS:
1. Actualizar `ALLOWED_ORIGINS` con tu dominio
2. Verificar que incluya `https://` en la URL

### Si no conecta a la BD:
1. Verificar credenciales de Supabase
2. Verificar que Supabase permita conexiones desde Vercel
3. Revisar `DB_HOST` y `DB_PASSWORD`
