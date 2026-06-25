export type Rol = "superadmin" | "negocio";

export interface Negocio {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  telefono_dueno: string;
  evolution_instance: string;
  horario_apertura: string;
  horario_cierre: string;
  horarios_json: string | null;
  duracion_turno_min: number;
  activo: number;
  created_at: string;
}

export interface HorarioBloque {
  apertura: string;
  cierre: string;
}

export interface HorarioDia {
  activo: boolean;
  bloques: HorarioBloque[];
}

export type HorariosSemana = Record<string, HorarioDia>;

export type PublicNegocio = Omit<Negocio, "password_hash">;

export interface Plan {
  id: number;
  nombre: string;
  precio_mensual: number;
  limite_turnos_mes: number | null;
  descripcion: string | null;
}

export type SuscripcionEstado = "activa" | "vencida" | "cancelada" | "suspendida";

export interface Suscripcion {
  id: number;
  negocio_id: number;
  plan_id: number;
  estado: SuscripcionEstado;
  fecha_inicio: string;
  fecha_vencimiento: string;
  notas: string | null;
  created_at: string;
}

export interface SuscripcionConPlan extends Suscripcion {
  plan_nombre: string;
  precio_mensual: number;
  limite_turnos_mes: number | null;
  descripcion: string | null;
}

export interface Pago {
  id: number;
  negocio_id: number;
  suscripcion_id: number;
  monto: number;
  fecha_pago: string;
  metodo: string | null;
  referencia: string | null;
  notas: string | null;
  created_at: string;
}

export interface Servicio {
  id: number;
  negocio_id: number;
  nombre: string;
  duracion_min: number;
  precio: number;
  activo: number;
  orden: number;
}

export type TurnoEstado = "confirmado" | "cancelado";

export interface Turno {
  id: number;
  negocio_id: number;
  nombre_cliente: string;
  telefono_cliente: string;
  fecha: string;
  hora: string;
  duracion_min: number;
  servicio_id: number | null;
  servicio_nombre: string | null;
  servicio_precio: number | null;
  estado: TurnoEstado;
  created_at: string;
}

export interface Bloqueo {
  id: number;
  negocio_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}

export interface Conversacion {
  id: number;
  negocio_id: number;
  telefono_cliente: string;
  historial: string;
  updated_at: string;
}

export interface MensajeLog {
  id: number;
  negocio_id: number | null;
  telefono: string | null;
  direccion: "entrante" | "saliente";
  contenido: string | null;
  created_at: string;
}

export interface JwtPayload {
  rol: Rol;
  email: string;
  negocio_id?: number;
}

export interface IncomingMessage {
  instance: string;
  from: string;
  body: string;
}

export interface PagoConNegocio extends Pago {
  negocio_nombre: string;
  negocio_email: string;
}

export interface ClienteMarketing {
  telefono: string;
  nombre: string;
  ultimo_turno: string | null;
  ultimo_mensaje: string | null;
  total_turnos: number;
  total_gastado: number;
}
