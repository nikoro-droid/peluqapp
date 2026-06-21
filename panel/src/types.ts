export type Rol = "superadmin" | "negocio";

export interface Session {
  token: string;
  rol: Rol;
  negocio_id?: number;
  nombre: string;
}

export interface Plan {
  id: number;
  nombre: string;
  precio_mensual: number;
  limite_turnos_mes: number | null;
  descripcion: string | null;
}

export interface Suscripcion {
  id: number;
  negocio_id: number;
  plan_id: number;
  estado: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  notas: string | null;
  plan_nombre?: string;
  precio_mensual?: number;
  limite_turnos_mes?: number | null;
}

export interface Negocio {
  id: number;
  nombre: string;
  email: string;
  telefono_dueno: string;
  evolution_instance: string;
  horario_apertura: string;
  horario_cierre: string;
  duracion_turno_min: number;
  activo: number;
  created_at: string;
  suscripcion?: Suscripcion | null;
  dias_restantes?: number;
  turnos_mes?: number;
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

export interface Turno {
  id: number;
  nombre_cliente: string;
  telefono_cliente: string;
  fecha: string;
  hora: string;
  duracion_min: number;
  servicio_nombre: string | null;
  servicio_precio: number | null;
  estado: string;
}

export interface Pago {
  id: number;
  monto: number;
  fecha_pago: string;
  metodo: string | null;
  referencia: string | null;
  notas: string | null;
}

export interface MensajeLog {
  id: number;
  telefono: string | null;
  direccion: string;
  contenido: string | null;
  created_at: string;
}

export interface PagoConNegocio extends Pago {
  negocio_id: number;
  suscripcion_id: number;
  negocio_nombre: string;
  negocio_email: string;
}

export interface ContabilidadResumen {
  peluquerias_activas: number;
  ingresos_periodo: number;
  facturacion_mensual_esperada: number;
  pagos: PagoConNegocio[];
}

export interface ClienteMarketing {
  telefono: string;
  nombre: string;
  ultimo_turno: string | null;
  ultimo_mensaje: string | null;
  total_turnos: number;
  total_gastado: number;
}
