import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { crearTurnoSiDisponible, getSlotsByDate } from "./scheduler";
import type { Negocio, Servicio } from "./types";

type ChatMessage = { role: "user" | "model"; content: string };
type ClientTurnoAction = { nombre?: string; fecha?: string; hora?: string; servicioId?: number };
export type OwnerCommand = { action: "bloquear"; fecha_inicio: string; fecha_fin: string; motivo?: string } | { action: "ver_turnos"; fecha: string } | { action: "none" };

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findDate(text: string): string | null {
  return text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ?? null;
}

function findServicio(text: string, servicios: Servicio[]): Servicio | null {
  const normalized = normalize(text);
  return servicios.find((servicio) => normalized.includes(normalize(servicio.nombre))) ?? null;
}

export function buildSystemPrompt(negocio: Negocio): string {
  const servicios = db.getServicios(negocio.id);
  return [
    `Sos el asistente de turnos de ${negocio.nombre}.`,
    `Horario de atencion: ${negocio.horario_apertura} a ${negocio.horario_cierre}.`,
    `Trabajos aceptados y configurados:\n${servicios.map((servicio) => `- ${servicio.nombre}: $${servicio.precio}, ${servicio.duracion_min} minutos (id ${servicio.id})`).join("\n") || "No hay servicios cargados."}`,
    "Responde en espanol rioplatense, breve y claro.",
    "Usa solo los trabajos configurados para hablar de servicios aceptados, precios y duraciones.",
    "Si preguntan por horarios de atencion, responde con el horario configurado.",
    "Si preguntan cuanto tarda o cuanto cuesta un trabajo, responde desde la lista de trabajos configurados.",
    "Para reservar, pedi servicio, fecha, horario y nombre.",
    "Para ofrecer horarios disponibles, usa solo los horarios reales del contexto cuando esten presentes.",
    "Cuando tengas todo, agrega al final este tag exacto: <!--TURNO:{\"nombre\":\"...\",\"fecha\":\"YYYY-MM-DD\",\"hora\":\"HH:MM\",\"servicioId\":N}-->.",
    "No prometas un turno confirmado si todavia no agregaste el tag TURNO."
  ].join("\n");
}

function buildRuntimeContext(negocio: Negocio, messages: ChatMessage[]): string {
  const servicios = db.getServicios(negocio.id);
  const transcript = messages.map((message) => message.content).join("\n");
  const servicio = findServicio(transcript, servicios);
  const fecha = findDate(transcript);
  const serviciosConfigurados = servicios.map((serv) => `${serv.id}=${serv.nombre} ($${serv.precio}, ${serv.duracion_min} min)`).join("; ") || "ninguno";
  const lines = [
    `Fecha actual: ${new Date().toISOString().slice(0, 10)}.`,
    `Horario de atencion configurado: ${negocio.horario_apertura} a ${negocio.horario_cierre}.`,
    `Trabajos configurados: ${serviciosConfigurados}.`
  ];
  if (servicio && fecha) lines.push(`Horarios reales para ${servicio.nombre} el ${fecha}: ${getSlotsByDate(negocio.id, fecha, servicio.duracion_min).join(", ") || "sin horarios"}.`);
  return lines.join("\n");
}

export async function askClaude(negocio: Negocio, from: string, body: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "Gracias por escribir. En este momento el asistente no tiene configurada la API de IA.";
  const previous = db.getConversacion(negocio.id, from);
  const history = previous ? (JSON.parse(previous.historial) as ChatMessage[]) : [];
  const messages = [...history.slice(-10), { role: "user" as const, content: body }];
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: buildSystemPrompt(negocio) });
  const response = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: buildRuntimeContext(negocio, messages) }] },
      { role: "model", parts: [{ text: "Entendido. Voy a usar solo esos horarios." }] },
      ...messages.map((message) => ({ role: message.role, parts: [{ text: message.content }] }))
    ],
    generationConfig: { maxOutputTokens: 500 }
  });
  const text = response.response.text().trim();
  db.upsertConversacion(negocio.id, from, JSON.stringify([...messages, { role: "model", content: text }].slice(-20)));
  return text;
}

function extractTurnoAction(text: string): ClientTurnoAction | null {
  const match = text.match(/<!--TURNO:(\{[\s\S]*?\})-->/)?.[1];
  if (!match) return null;
  try { return JSON.parse(match) as ClientTurnoAction; } catch { return null; }
}

export async function handleClientMessage(negocio: Negocio, from: string, body: string): Promise<string> {
  let respuesta: string;
  try {
    respuesta = await askClaude(negocio, from, body);
  } catch {
    const servicios = db.getServicios(negocio.id).map((servicio) => `${servicio.nombre} ($${servicio.precio}, ${servicio.duracion_min} min)`).join(", ");
    return `Hola, soy el asistente de ${negocio.nombre}. Puedo ayudarte con turnos. ${servicios ? `Trabajos disponibles: ${servicios}. ` : ""}Decime que servicio queres, que dia, a que hora y tu nombre.`;
  }
  const action = extractTurnoAction(respuesta);
  if (!action?.nombre || !action.fecha || !action.hora || !action.servicioId) return respuesta.replace(/<!--TURNO:[\s\S]*?-->/g, "").trim();
  const result = crearTurnoSiDisponible(negocio, { nombre_cliente: action.nombre, telefono_cliente: from, fecha: action.fecha, hora: action.hora, servicio_id: action.servicioId });
  if (result.turno) return `Listo, ${action.nombre}. Tu turno quedo confirmado para ${result.turno.servicio_nombre} el ${action.fecha} a las ${action.hora}.`;
  if (result.error === "no_disponible") {
    const servicio = db.getServicioById(action.servicioId);
    const opciones = servicio ? getSlotsByDate(negocio.id, action.fecha, servicio.duracion_min).slice(0, 5).join(", ") : "";
    return opciones ? `Ese horario no esta disponible. Para el ${action.fecha} tengo: ${opciones}.` : "Ese dia no tengo horarios disponibles.";
  }
  return "Lo sentimos, el sistema de turnos no esta disponible en este momento. Contactanos directamente.";
}

export function parseOwnerCommand(body: string): OwnerCommand {
  const lower = body.toLowerCase().trim();
  const turnos = lower.match(/^turnos\s+(\d{4}-\d{2}-\d{2})$/);
  if (turnos) return { action: "ver_turnos", fecha: turnos[1] };
  const bloqueo = lower.match(/^bloquear\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})(?:\s+(.+))?$/);
  if (bloqueo) return { action: "bloquear", fecha_inicio: bloqueo[1], fecha_fin: bloqueo[2], motivo: bloqueo[3] };
  return { action: "none" };
}
