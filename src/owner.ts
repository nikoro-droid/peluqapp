import { parseOwnerCommand } from "./claude";
import { db } from "./db";
import type { Negocio } from "./types";

function formatPrecio(precio: number): string {
  return `$${precio.toLocaleString("es-AR")}`;
}

function handleServicioCommand(negocio: Negocio, body: string): string | null {
  const text = body.trim();
  const lower = text.toLowerCase();

  // Listar servicios
  if (lower === "servicios" || lower === "menu" || lower.includes("cuanto sale") || lower.includes("lista de servicios")) {
    const servicios = db.getServicios(negocio.id);
    return servicios.length
      ? servicios.map((servicio) => `${servicio.nombre}: ${formatPrecio(servicio.precio)}, ${servicio.duracion_min} min`).join("\n")
      : "No hay servicios activos cargados.";
  }

  // Agregar servicio: "agrega Corte 30 minutos $3500" o "agrega Corte 30 3500"
  const crear = text.match(/^(?:agrega|agregá|suma)\s+(.+?)\s+(\d+)\s*(?:minutos|min)?\s+\$?\s*(\d+(?:[.,]\d+)?)$/i);
  if (crear) {
    const servicio = db.createServicio(negocio.id, {
      nombre: crear[1].trim(),
      duracion_min: Number(crear[2]),
      precio: Number(crear[3].replace(",", "."))
    });
    return `Listo, agregue ${servicio.nombre} (${formatPrecio(servicio.precio)}, ${servicio.duracion_min} min).`;
  }

  // Eliminar servicio: "elimina Corte" o "borra Corte"
  const eliminar = text.match(/^(?:elimina|borra|quita|eliminar|borrar)\s+(.+)$/i);
  if (eliminar) {
    const nombre = eliminar[1].trim();
    const servicio = db.getServicioByNombre(negocio.id, nombre);
    if (!servicio) return `No encontre el servicio "${nombre}". Revisa con "servicios".`;
    db.deleteServicio(servicio.id);
    return `${servicio.nombre} fue desactivado del menu.`;
  }

  // Actualizar precio: "precio Corte $4000" o "precio Corte 4000"
  const actualizarPrecio = text.match(/^precio\s+(.+?)\s+\$?\s*(\d+(?:[.,]\d+)?)$/i);
  if (actualizarPrecio) {
    const nombre = actualizarPrecio[1].trim();
    const nuevoPrecio = Number(actualizarPrecio[2].replace(",", "."));
    const servicio = db.getServicioByNombre(negocio.id, nombre);
    if (!servicio) return `No encontre el servicio "${nombre}". Revisa con "servicios".`;
    db.updateServicio(servicio.id, { precio: nuevoPrecio });
    return `Listo, ${servicio.nombre} actualizado a ${formatPrecio(nuevoPrecio)}.`;
  }

  // Actualizar duracion: "duracion Corte 45"
  const actualizarDuracion = text.match(/^duracion\s+(.+?)\s+(\d+)(?:\s*min(?:utos)?)?$/i);
  if (actualizarDuracion) {
    const nombre = actualizarDuracion[1].trim();
    const nuevaDuracion = Number(actualizarDuracion[2]);
    const servicio = db.getServicioByNombre(negocio.id, nombre);
    if (!servicio) return `No encontre el servicio "${nombre}". Revisa con "servicios".`;
    db.updateServicio(servicio.id, { duracion_min: nuevaDuracion });
    return `Listo, ${servicio.nombre} ahora dura ${nuevaDuracion} minutos.`;
  }

  return null;
}

export async function handleOwnerMessage(negocio: Negocio, body: string): Promise<string> {
  const servicioResponse = handleServicioCommand(negocio, body);
  if (servicioResponse) return servicioResponse;

  const command = parseOwnerCommand(body);
  if (command.action === "ver_turnos") {
    const turnos = db.listTurnos(negocio.id, command.fecha, command.fecha).filter((turno) => turno.estado === "confirmado");
    return turnos.length
      ? turnos.map((turno) => `${turno.hora} - ${turno.nombre_cliente} (${turno.telefono_cliente}) - ${turno.servicio_nombre ?? "Servicio"}`).join("\n")
      : `No hay turnos confirmados para el ${command.fecha}.`;
  }
  if (command.action === "bloquear") {
    db.createBloqueo({ negocio_id: negocio.id, fecha_inicio: command.fecha_inicio, fecha_fin: command.fecha_fin, motivo: command.motivo ?? null });
    return `Horario bloqueado desde ${command.fecha_inicio} hasta ${command.fecha_fin}.`;
  }

  const lineas = [
    "Comandos disponibles:",
    "",
    "📅 *Ver turnos*",
    "  turnos YYYY-MM-DD",
    "",
    "🚫 *Bloquear horario*",
    "  bloquear YYYY-MM-DD HH:MM YYYY-MM-DD HH:MM motivo",
    "",
    "✂️ *Servicios*",
    "  servicios  →  ver lista",
    "  agrega Nombre 45 minutos $3500  →  nuevo servicio",
    "  precio Nombre $4000  →  actualizar precio",
    "  duracion Nombre 60  →  actualizar duración",
    "  elimina Nombre  →  quitar servicio"
  ];
  return lineas.join("\n");
}
