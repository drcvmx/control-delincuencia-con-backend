create table public.crimen (
  id serial not null,
  descripcion character varying(200) not null,
  fecha_ocurrencia date not null,
  ubicacion character varying(100) null,
  constraint crimen_pkey primary key (id)
) TABLESPACE pg_default;

create table public.delincuente (
  id_persona integer not null,
  fecha_alta_delincuente date not null,
  alias character varying(50) null,
  antecedentes text null,
  fecha_detencion date null,
  lugar_detencion character varying(100) null,
  constraint delincuente_pkey primary key (id_persona),
  constraint delincuente_id_persona_fkey foreign KEY (id_persona) references persona (id)
) TABLESPACE pg_default;

create table public.delincuente_crimen (
  id_delincuente integer not null,
  id_crimen integer not null,
  fecha_participacion date null,
  rol character varying(50) null,
  constraint delincuente_crimen_pkey primary key (id_delincuente, id_crimen),
  constraint delincuente_crimen_id_crimen_fkey foreign KEY (id_crimen) references crimen (id),
  constraint delincuente_crimen_id_delincuente_fkey foreign KEY (id_delincuente) references delincuente (id_persona)
) TABLESPACE pg_default;

create table public.estatus_penitenciario (
  id_delincuente integer not null,
  id_carcel integer not null,
  id_celda character varying(20) not null,
  fecha_ingreso date not null,
  fecha_salida_prevista date null,
  fecha_salida_real date null,
  motivo_encarcelamiento character varying(200) not null,
  constraint estatus_penitenciario_pkey primary key (id_delincuente),
  constraint estatus_penitenciario_id_delincuente_fkey foreign KEY (id_delincuente) references delincuente (id_persona)
) TABLESPACE pg_default

create table public.persona (
  id serial not null,
  nombre character varying(50) not null,
  apellido_paterno character varying(50) not null,
  apellido_materno character varying(50) not null,
  fecha_de_nacimiento date not null,
  fecha_de_fin date null,
  constraint persona_pkey primary key (id)
) TABLESPACE pg_default;

 CREATE TABLE public.carcel (
     id serial NOT NULL,
     nombre_oficial character varying(200) NOT NULL,
     apodo character varying(50) NULL,
     ubicacion character varying(100) NULL,
     CONSTRAINT carcel_pkey PRIMARY KEY (id)
   ) TABLESPACE pg_default;

-- Tabla de roles del sistema
CREATE TABLE public.rol (
    id SERIAL NOT NULL,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rol_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Tabla de usuarios del sistema
CREATE TABLE public.usuario (
    id SERIAL NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_acceso TIMESTAMP NULL,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP NULL,
    CONSTRAINT usuario_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Tabla de asignación usuario-rol (muchos a muchos)
CREATE TABLE public.usuario_rol (
    id_usuario INTEGER NOT NULL,
    id_rol INTEGER NOT NULL,
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    asignado_por INTEGER NULL, -- quien asignó el rol
    activo BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT usuario_rol_pkey PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT usuario_rol_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuario (id),
    CONSTRAINT usuario_rol_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES rol (id),
    CONSTRAINT usuario_rol_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES usuario (id)
) TABLESPACE pg_default;

-- Tabla de permisos específicos (opcional, para granularidad)
CREATE TABLE public.permiso (
    id SERIAL NOT NULL,
    modulo VARCHAR(50) NOT NULL, -- 'personas', 'delincuentes', 'crimenes', etc.
    accion VARCHAR(20) NOT NULL, -- 'crear', 'leer', 'actualizar', 'eliminar'
    descripcion VARCHAR(200) NULL,
    CONSTRAINT permiso_pkey PRIMARY KEY (id),
    CONSTRAINT permiso_modulo_accion_unique UNIQUE (modulo, accion)
) TABLESPACE pg_default;

-- Tabla de permisos por rol
CREATE TABLE public.rol_permiso (
    id_rol INTEGER NOT NULL,
    id_permiso INTEGER NOT NULL,
    CONSTRAINT rol_permiso_pkey PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT rol_permiso_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES rol (id),
    CONSTRAINT rol_permiso_id_permiso_fkey FOREIGN KEY (id_permiso) REFERENCES permiso (id)
) TABLESPACE pg_default;

-- Tabla de sesiones (para manejo de JWT/tokens)
CREATE TABLE public.sesion_usuario (
    id SERIAL NOT NULL,
    id_usuario INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT sesion_usuario_pkey PRIMARY KEY (id),
    CONSTRAINT sesion_usuario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuario (id)
) TABLESPACE pg_default;