import { db } from "./db";
import { canCrearTurno } from "./subscriptions";
import type { Negocio, Turno } from "./types";

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function rangeFor(fecha: string, hora: string, duracionMin: number): { start: string; end: string } {
  return { start: `${fecha} ${hora}`, end: `${fecha} ${minutesToTime(timeToMinutes(hora) + duracionMin)}` };
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

export function isSlotAvailable(negocioId: number, fecha: string, hora: string, duracionMin: number): boolean {
  const negocio = db.getNegocioById(negocioId);
  if (!negocio) return false;
  const start = timeToMinutes(hora);
  const end = start + duracionMin;
  if (start < timeToMinutes(negocio.horario_apertura) || end > timeToMinutes(negocio.horario_cierre)) return false;
  const slot = rangeFor(fecha, hora, duracionMin);
  const ocupado = db.listTurnos(negocioId, fecha, fecha)
    .filter((turno) => turno.estado === "confirmado")
    .some((turno) => {
      const current = rangeFor(fecha, turno.hora, turno.duracion_min);
      return overlaps(slot.start, slot.end, current.start, current.end);
    });
  if (ocupado) return false;
  return !db.listBloqueos(negocioId).some((bloqueo) => overlaps(slot.start, slot.end, bloqueo.fecha_inicio, bloqueo.fecha_fin));
}

export function getSlotsByDate(negocioId: number, fecha: string, duracionMin: number): string[] {
  const negocio = db.getNegocioById(negocioId);
  if (!negocio) return [];
  const slots: string[] = [];
  for (let cursor = timeToMinutes(negocio.horario_apertura); cursor + duracionMin <= timeToMinutes(negocio.horario_cierre); cursor += negocio.duracion_turno_min) {
    const hora = minutesToTime(cursor);
    if (isSlotAvailable(negocioId, fecha, hora, duracionMin)) slots.push(hora);
  }
  return slots;
}

export function crearTurnoSiDisponible(negocio: Negocio, input: { nombre_cliente: string; telefono_cliente: string; fecha: string; hora: string; servicio_id?: number }): { turno?: Turno; error?: "no_disponible" | "suscripcion_vencida" | "limite_alcanzado" | "servicio_invalido" } {
  const permiso = canCrearTurno(negocio.id);
  if (!permiso.permitido) return { error: permiso.razon };
  const servicio = input.servicio_id ? db.getServicioById(input.servicio_id) : db.getServicios(negocio.id)[0];
  if (!servicio || servicio.negocio_id !== negocio.id || servicio.activo !== 1) return { error: "servicio_invalido" };
  if (!isSlotAvailable(negocio.id, input.fecha, input.hora, servicio.duracion_min)) return { error: "no_disponible" };
  const turno = db.createTurno({
    negocio_id: negocio.id,
    nombre_cliente: input.nombre_cliente,
    telefono_cliente: input.telefono_cliente,
    fecha: input.fecha,
    hora: input.hora,
    duracion_min: servicio.duracion_min,
    servicio_id: servicio.id,
    servicio_nombre: servicio.nombre,
    servicio_precio: servicio.precio
  });
  return { turno };
}
