import { db } from "./db";
import type { Suscripcion, SuscripcionConPlan } from "./types";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function today(): string {
  return isoDate(new Date());
}

function monthRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
  };
}

export function getSuscripcionActiva(negocioId: number): SuscripcionConPlan | null {
  return db.getSuscripcionActiva(negocioId);
}

export function getTurnosMes(negocioId: number): number {
  const range = monthRange();
  return db.countTurnosConfirmados(negocioId, range.start, range.end);
}

export function canCrearTurno(negocioId: number): { permitido: boolean; razon?: "suscripcion_vencida" | "limite_alcanzado" } {
  const negocio = db.getNegocioById(negocioId);
  const suscripcion = getSuscripcionActiva(negocioId);
  if (!negocio || negocio.activo !== 1 || !suscripcion || suscripcion.fecha_vencimiento < today()) return { permitido: false, razon: "suscripcion_vencida" };
  if (suscripcion.limite_turnos_mes !== null && getTurnosMes(negocioId) >= suscripcion.limite_turnos_mes) return { permitido: false, razon: "limite_alcanzado" };
  return { permitido: true };
}

export function getDiasRestantes(negocioId: number): number {
  const suscripcion = getSuscripcionActiva(negocioId);
  if (!suscripcion) return 0;
  const diff = new Date(`${suscripcion.fecha_vencimiento}T00:00:00Z`).getTime() - new Date(`${today()}T00:00:00Z`).getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function renovarSuscripcion(negocioId: number, planId: number, meses: number): Suscripcion {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + meses, now.getUTCDate()));
  db.updateSuscripcionesEstado(negocioId, "activa", "cancelada");
  return db.createSuscripcion({ negocio_id: negocioId, plan_id: planId, fecha_inicio: today(), fecha_vencimiento: isoDate(end) });
}

export function suspenderNegocio(negocioId: number, motivo: string): void {
  db.updateNegocio(negocioId, { activo: 0 });
  db.updateSuscripcionesEstado(negocioId, "activa", "suspendida");
  db.logMensaje(negocioId, null, "saliente", `Negocio suspendido: ${motivo}`);
}

export function reactivarNegocio(negocioId: number): void {
  db.updateNegocio(negocioId, { activo: 1 });
  const vigente = db.listSuscripciones(negocioId).find((suscripcion) => suscripcion.fecha_vencimiento >= today());
  if (vigente) db.updateSuscripcion(vigente.id, { estado: "activa" });
}
