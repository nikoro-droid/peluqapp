import path from "node:path";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { login, requireNegocio, requireSuperadmin } from "./auth";
import { handleClientMessage } from "./claude";
import { db, initDB } from "./db";
import { handleOwnerMessage } from "./owner";
import { getDiasRestantes, getSuscripcionActiva, getTurnosMes, reactivarNegocio, renovarSuscripcion, suspenderNegocio } from "./subscriptions";
import { parseIncoming, sendMessage } from "./whatsapp";

dotenv.config();
initDB();

const app = express();
const port = Number(process.env.PORT ?? 3000);
app.use((req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "2mb" }));

function today(): string { return new Date().toISOString().slice(0, 10); }
function addDays(days: number): string { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function monthRange(): { start: string; end: string } {
  const now = new Date();
  return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10) };
}
function idParam(value: unknown): number | null { if (Array.isArray(value)) return null; const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; }

async function handleIncoming(instance: string, from: string, body: string): Promise<void> {
  const negocio = db.getNegocioByInstance(instance);
  if (!negocio || negocio.activo !== 1) return;
  db.logMensaje(negocio.id, from, "entrante", body);
  const respuesta = from === negocio.telefono_dueno ? await handleOwnerMessage(negocio, body) : await handleClientMessage(negocio, from, body);
  await sendMessage(instance, from, respuesta);
  db.logMensaje(negocio.id, from, "saliente", respuesta);
}

app.post("/api/auth/login", login);
app.post("/webhook", (req: Request, res: Response) => {
  res.sendStatus(200);
  const message = parseIncoming(req.body);
  if (message) handleIncoming(message.instance, message.from, message.body).catch(console.error);
});

app.get("/api/superadmin/stats", requireSuperadmin, (_req, res) => {
  const raw = db.raw();
  const range = monthRange();
  const total = raw.prepare("SELECT COUNT(*) total FROM negocios").get() as { total: number };
  const activos = raw.prepare("SELECT COUNT(*) total FROM negocios WHERE activo = 1").get() as { total: number };
  const suspendidos = raw.prepare("SELECT COUNT(*) total FROM negocios WHERE activo = 0").get() as { total: number };
  const ingresos = raw.prepare("SELECT COALESCE(SUM(monto), 0) total FROM pagos WHERE fecha_pago BETWEEN ? AND ?").get(range.start, range.end) as { total: number };
  const turnos = raw.prepare("SELECT COUNT(*) total FROM turnos WHERE fecha BETWEEN ? AND ?").get(range.start, range.end) as { total: number };
  res.json({ total_negocios: total.total, negocios_activos: activos.total, negocios_suspendidos: suspendidos.total, ingresos_mes_actual: ingresos.total, turnos_procesados_mes: turnos.total });
});

app.get("/api/superadmin/negocios", requireSuperadmin, (_req, res) => {
  res.json(db.listNegocios().map((negocio) => ({ ...negocio, suscripcion: getSuscripcionActiva(negocio.id), dias_restantes: getDiasRestantes(negocio.id), turnos_mes: getTurnosMes(negocio.id) })));
});

app.post("/api/superadmin/negocios", requireSuperadmin, (req, res) => {
  const body = req.body as { nombre?: string; email?: string; password?: string; telefono_dueno?: string; evolution_instance?: string; plan_id?: number; meses?: number };
  if (!body.nombre || !body.email || !body.password || !body.telefono_dueno || !body.evolution_instance) { res.status(400).json({ error: "campos_requeridos" }); return; }
  const negocio = db.createNegocio({ nombre: body.nombre, email: body.email, password: body.password, telefono_dueno: body.telefono_dueno, evolution_instance: body.evolution_instance });
  if (body.plan_id) renovarSuscripcion(negocio.id, body.plan_id, body.meses ?? 1);
  res.status(201).json({ ...negocio, suscripcion: getSuscripcionActiva(negocio.id) });
});

app.get("/api/superadmin/negocios/:id", requireSuperadmin, (req, res) => {
  const id = idParam(req.params.id);
  if (!id) { res.status(400).json({ error: "id_invalido" }); return; }
  const negocio = db.getPublicNegocio(id);
  if (!negocio) { res.status(404).json({ error: "no_encontrado" }); return; }
  const range = monthRange();
  res.json({ negocio, suscripcion: getSuscripcionActiva(id), suscripciones: db.listSuscripciones(id), pagos: db.listPagos(id), turnos_mes: db.listTurnos(id, range.start, range.end), mensajes: db.listMensajes(id), dias_restantes: getDiasRestantes(id) });
});

app.patch("/api/superadmin/negocios/:id", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } res.json(db.updateNegocio(id, req.body as Parameters<typeof db.updateNegocio>[1])); });
app.delete("/api/superadmin/negocios/:id", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } db.updateNegocio(id, { activo: 0 }); res.json({ ok: true }); });
app.post("/api/superadmin/negocios/:id/suscripcion", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); const body = req.body as { plan_id?: number; meses?: number }; if (!id || !body.plan_id) { res.status(400).json({ error: "datos_invalidos" }); return; } res.status(201).json(renovarSuscripcion(id, body.plan_id, body.meses ?? 1)); });
app.post("/api/superadmin/negocios/:id/suspender", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } suspenderNegocio(id, "Panel"); res.json({ ok: true }); });
app.post("/api/superadmin/negocios/:id/reactivar", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } reactivarNegocio(id); res.json({ ok: true }); });
app.post("/api/superadmin/negocios/:id/pagos", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); const body = req.body as { suscripcion_id?: number; monto?: number; fecha_pago?: string; metodo?: string; referencia?: string; notas?: string }; if (!id || !body.suscripcion_id || !body.monto || !body.fecha_pago) { res.status(400).json({ error: "datos_invalidos" }); return; } res.status(201).json(db.createPago({ negocio_id: id, suscripcion_id: body.suscripcion_id, monto: body.monto, fecha_pago: body.fecha_pago, metodo: body.metodo ?? null, referencia: body.referencia ?? null, notas: body.notas ?? null })); });

app.get("/api/superadmin/negocios/:id/servicios", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } res.json(db.listServicios(id)); });
app.post("/api/superadmin/negocios/:id/servicios", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); const body = req.body as { nombre?: string; duracion_min?: number; precio?: number; orden?: number }; if (!id || !body.nombre || !body.duracion_min || body.precio === undefined) { res.status(400).json({ error: "datos_invalidos" }); return; } res.status(201).json(db.createServicio(id, { nombre: body.nombre, duracion_min: Number(body.duracion_min), precio: Number(body.precio), orden: body.orden })); });
app.patch("/api/superadmin/negocios/:id/servicios/:servicioId", requireSuperadmin, (req, res) => { const servicioId = idParam(req.params.servicioId); if (!servicioId) { res.status(400).json({ error: "id_invalido" }); return; } res.json(db.updateServicio(servicioId, req.body as Parameters<typeof db.updateServicio>[1])); });
app.delete("/api/superadmin/negocios/:id/servicios/:servicioId", requireSuperadmin, (req, res) => { const servicioId = idParam(req.params.servicioId); if (!servicioId) { res.status(400).json({ error: "id_invalido" }); return; } db.deleteServicio(servicioId); res.json({ ok: true }); });

app.get("/api/superadmin/planes", requireSuperadmin, (_req, res) => res.json(db.listPlanes()));
app.post("/api/superadmin/planes", requireSuperadmin, (req, res) => res.status(201).json(db.createPlan(req.body as Parameters<typeof db.createPlan>[0])));
app.patch("/api/superadmin/planes/:id", requireSuperadmin, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } res.json(db.updatePlan(id, req.body as Parameters<typeof db.updatePlan>[1])); });

app.get("/api/negocio/stats", requireNegocio, (req, res) => {
  const negocioId = req.user!.negocio_id!;
  const range = monthRange();
  const suscripcion = getSuscripcionActiva(negocioId);
  const usados = getTurnosMes(negocioId);
  const limite = suscripcion?.limite_turnos_mes ?? null;
  res.json({ turnos_hoy: db.countTurnosConfirmados(negocioId, today(), today()), turnos_semana: db.countTurnosConfirmados(negocioId, today(), addDays(7)), turnos_mes: db.countTurnosConfirmados(negocioId, range.start, range.end), turnos_usados_mes: usados, limite_turnos_mes: limite, porcentaje_uso: limite ? Math.round((usados / limite) * 100) : 0, dias_restantes_suscripcion: getDiasRestantes(negocioId), estado_suscripcion: suscripcion?.estado ?? "sin_plan", nombre_plan: suscripcion?.plan_nombre ?? null });
});
app.get("/api/negocio/turnos", requireNegocio, (req, res) => { const fecha = typeof req.query.fecha === "string" ? req.query.fecha : today(); res.json(db.listTurnos(req.user!.negocio_id!, fecha, fecha)); });
app.delete("/api/negocio/turnos/:id", requireNegocio, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } db.cancelTurno(req.user!.negocio_id!, id); res.json({ ok: true }); });
app.get("/api/negocio/servicios", requireNegocio, (req, res) => res.json(db.listServicios(req.user!.negocio_id!)));
app.post("/api/negocio/servicios", requireNegocio, (req, res) => { const body = req.body as { nombre?: string; duracion_min?: number; precio?: number; orden?: number }; if (!body.nombre || !body.duracion_min || body.precio === undefined) { res.status(400).json({ error: "datos_invalidos" }); return; } res.status(201).json(db.createServicio(req.user!.negocio_id!, { nombre: body.nombre, duracion_min: Number(body.duracion_min), precio: Number(body.precio), orden: body.orden })); });
app.patch("/api/negocio/servicios/:id", requireNegocio, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } res.json(db.updateServicio(id, req.body as Parameters<typeof db.updateServicio>[1])); });
app.delete("/api/negocio/servicios/:id", requireNegocio, (req, res) => { const id = idParam(req.params.id); if (!id) { res.status(400).json({ error: "id_invalido" }); return; } db.deleteServicio(id); res.json({ ok: true }); });
app.post("/api/negocio/bloqueos", requireNegocio, (req, res) => { const body = req.body as { fecha_inicio?: string; fecha_fin?: string; motivo?: string }; if (!body.fecha_inicio || !body.fecha_fin) { res.status(400).json({ error: "datos_invalidos" }); return; } res.status(201).json(db.createBloqueo({ negocio_id: req.user!.negocio_id!, fecha_inicio: body.fecha_inicio, fecha_fin: body.fecha_fin, motivo: body.motivo ?? null })); });
app.get("/api/negocio/config", requireNegocio, (req, res) => res.json(db.getPublicNegocio(req.user!.negocio_id!)));
app.patch("/api/negocio/config", requireNegocio, (req, res) => res.json(db.updateNegocio(req.user!.negocio_id!, req.body as Parameters<typeof db.updateNegocio>[1])));
app.post("/api/negocio/config/password", requireNegocio, (req, res) => { const body = req.body as { password?: string }; if (!body.password || body.password.length < 8) { res.status(400).json({ error: "password_min_8" }); return; } db.setNegocioPassword(req.user!.negocio_id!, body.password); res.json({ ok: true }); });
app.get("/api/negocio/suscripcion", requireNegocio, (req, res) => { const id = req.user!.negocio_id!; res.json({ suscripcion: getSuscripcionActiva(id), dias_restantes: getDiasRestantes(id), turnos_usados_mes: getTurnosMes(id), pagos: db.listPagos(id) }); });

const panelDist = path.join(process.cwd(), "panel", "dist");
app.use("/panel", express.static(panelDist));
app.get("/panel/*", (_req, res) => res.sendFile(path.join(panelDist, "index.html")));
app.get("/", (_req, res) => res.redirect("/panel"));
app.listen(port, () => console.log(`PeluqApp escuchando en http://localhost:${port}`));
