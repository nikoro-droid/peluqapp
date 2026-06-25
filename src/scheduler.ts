import { db } from "./db";
import { canCrearTurno } from "./subscriptions";
import type { HorarioBloque, HorariosSemana, Negocio, Turno } from "./types";

const dayKeys = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function defaultBlock(negocio: Negocio): HorarioBloque {
  return { apertura: negocio.horario_apertura, cierre: negocio.horario_cierre };
}

export function getHorariosSemana(negocio: Negocio): HorariosSemana {
  if (negocio.horarios_json) {
    try {
      const parsed = JSON.parse(negocio.horarios_json) as HorariosSemana;
      return parsed;
    } catch {
      // Sigue usando el horario simple si hay configuracion vieja o corrupta.
    }
  }
  return {
    lunes: { activo: true, bloques: [defaultBlock(negocio)] },
    martes: { activo: true, bloques: [defaultBlock(negocio)] },
    miercoles: { activo: true, bloques: [defaultBlock(negocio)] },
    jueves: { activo: true, bloques: [defaultBlock(negocio)] },
    viernes: { activo: true, bloques: [defaultBlock(negocio)] },
    sabado: { activo: true, bloques: [defaultBlock(negocio)] },
    domingo: { activo: false, bloques: [] }
  };
}

function bloquesForDate(negocio: Negocio, fecha: string): HorarioBloque[] {
  const date = new Date(`${fecha}T00:00:00`);
  const day = dayKeys[date.getDay()];
  const horario = getHorariosSemana(negocio)[day];
  if (!horario?.activo) return [];
  return horario.bloques
    .filter((bloque) => bloque.apertura && bloque.cierre && timeToMinutes(bloque.apertura) < timeToMinutes(bloque.cierre))
    .sort((a, b) => a.apertura.localeCompare(b.apertura));
}

export function describeHorarios(negocio: Negocio): string {
  const horarios = getHorariosSemana(negocio);
  return (Object.entries(horarios) as Array<[string, { activo: boolean; bloques: HorarioBloque[] }]>)
    .map(([dia, horario]) => {
      if (!horario.activo || !horario.bloques.length) return `${dia}: cerrado`;
      return `${dia}: ${horario.bloques.map((bloque) => `${bloque.apertura} a ${bloque.cierre}`).join(" y ")}`;
    })
    .join("; ");
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
  const insideBusinessHours = bloquesForDate(negocio, fecha).some((bloque) => start >= timeToMinutes(bloque.apertura) && end <= timeToMinutes(bloque.cierre));
  if (!insideBusinessHours) return false;
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
  for (const bloque of bloquesForDate(negocio, fecha)) {
    for (let cursor = timeToMinutes(bloque.apertura); cursor + duracionMin <= timeToMinutes(bloque.cierre); cursor += negocio.duracion_turno_min) {
      const hora = minutesToTime(cursor);
      if (isSlotAvailable(negocioId, fecha, hora, duracionMin)) slots.push(hora);
    }
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
