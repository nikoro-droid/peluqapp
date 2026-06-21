import { parseOwnerCommand } from "./claude";
import { db } from "./db";
import type { Negocio } from "./types";

function formatPrecio(precio: number): string {
  return `$${precio}`;
}

function handleServicioCommand(negocio: Negocio, body: string): string | null {
  const text = body.trim();
  const lower = text.toLowerCase();
  if (lower.includes("servicios") || lower.includes("menu") || lower.includes("cuanto sale")) {
    const servicios = db.getServicios(negocio.id);
    return servicios.length ? servicios.map((servicio) => `${servicio.nombre}: ${formatPrecio(servicio.precio)}, ${servicio.duracion_min} min`).join("\n") : "No hay servicios activos cargados.";
  }
  const crear = text.match(/^(?:agrega|agregá|suma)\s+(.+?)\s+(\d+)\s*(?:minutos|min)?\s+\$?\s*(\d+(?:[.,]\d+)?)$/i);
  if (crear) {
    const servicio = db.createServicio(negocio.id, { nombre: crear[1].trim(), duracion_min: Number(crear[2]), precio: Number(crear[3].replace(",", ".")) });
    return `Listo, agregue ${servicio.nombre} (${formatPrecio(servicio.precio)}, ${servicio.duracion_min} min).`;
  }
  return null;
}

export async function handleOwnerMessage(negocio: Negocio, body: string): Promise<string> {
  const servicioResponse = handleServicioCommand(negocio, body);
  if (servicioResponse) return servicioResponse;

  const command = parseOwnerCommand(body);
  if (command.action === "ver_turnos") {
    const turnos = db.listTurnos(negocio.id, command.fecha, command.fecha).filter((turno) => turno.estado === "confirmado");
    return turnos.length ? turnos.map((turno) => `${turno.hora} - ${turno.nombre_cliente} (${turno.telefono_cliente}) - ${turno.servicio_nombre ?? "Servicio"}`).join("\n") : `No hay turnos confirmados para el ${command.fecha}.`;
  }
  if (command.action === "bloquear") {
    db.createBloqueo({ negocio_id: negocio.id, fecha_inicio: command.fecha_inicio, fecha_fin: command.fecha_fin, motivo: command.motivo ?? null });
    return `Horario bloqueado desde ${command.fecha_inicio} hasta ${command.fecha_fin}.`;
  }
  return ["Comandos disponibles:", "turnos YYYY-MM-DD", "bloquear YYYY-MM-DD HH:MM YYYY-MM-DD HH:MM motivo", "servicios", "agrega Servicio 45 minutos $3500"].join("\n");
}
