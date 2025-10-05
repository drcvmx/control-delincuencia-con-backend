export interface Persona {
  id: number
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  fecha_de_nacimiento: string
  fecha_de_fin: string | null
}

export interface Delincuente {
  id_persona: number
  fecha_alta_delincuente: string
  alias: string | null
  antecedentes: string | null
  fecha_detencion: string | null
  lugar_detencion: string | null
}

export interface EstatusPenitenciario {
  id_delincuente: number
  id_carcel: number
  id_celda: string
  fecha_ingreso: string
  fecha_salida_prevista: string | null
  fecha_salida_real: string | null
  motivo_encarcelamiento: string
}

export interface Crimen {
  id: number
  descripcion: string
  fecha_ocurrencia: string
  ubicacion: string | null
}

export interface DelincuenteCrimen {
  id_delincuente: number
  id_crimen: number
  fecha_participacion: string | null
  rol: string | null
}

export interface PersonaCompleta extends Persona {
  delincuente?: Delincuente
  estatus_penitenciario?: EstatusPenitenciario
  crimenes?: Crimen[]
}

// Actualizar interfaces para coincidir con el backend
export interface User {
  id: string;
  username: string;
  email: string;
  roles: Array<{id: string, nombre: string}>;
  permissions: string[];
  activo: boolean;
  fecha_creacion: string;
  fecha_ultimo_acceso?: string;
}
