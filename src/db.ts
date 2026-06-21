import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import type { Bloqueo, ClienteMarketing, Conversacion, MensajeLog, Negocio, Pago, PagoConNegocio, Plan, PublicNegocio, Servicio, Suscripcion, SuscripcionConPlan, SuscripcionEstado, Turno } from "./types";

const dbDir = process.env.DB_DIR ?? path.join(process.cwd(), "db");
const dbPath = path.join(dbDir, "database.sqlite");
let database: Database.Database | null = null;

function connection(): Database.Database {
  if (!database) {
    fs.mkdirSync(dbDir, { recursive: true });
    database = new Database(dbPath);
    database.pragma("foreign_keys = ON");
  }
  return database;
}


const serviciosBasePeluqueria: Array<[string, number, number]> = [
  ["Corte", 30, 0],
  ["Corte + Barba", 45, 0],
  ["Barba", 30, 0],
  ["Brushing", 30, 0],
  ["Peinado", 45, 0],
  ["Color", 90, 0],
  ["Tintura", 90, 0],
  ["Mechas", 120, 0],
  ["Balayage", 150, 0],
  ["Decoloracion", 120, 0],
  ["Alisado", 180, 0],
  ["Keratina", 120, 0],
  ["Nutricion capilar", 60, 0],
  ["Hidratacion", 45, 0],
  ["Lavado", 15, 0],
  ["Permanente", 120, 0]
];

function seedServiciosBaseFor(database: Database.Database, negocioId: number): void {
  const insert = database.prepare("INSERT OR IGNORE INTO servicios (negocio_id,nombre,duracion_min,precio,orden) VALUES (?, ?, ?, ?, ?)");
  serviciosBasePeluqueria.forEach(([nombre, duracion, precio], index) => insert.run(negocioId, nombre, duracion, precio, index));
}
function publicNegocioSelect(): string {
  return "id,nombre,email,telefono_dueno,evolution_instance,horario_apertura,horario_cierre,duracion_turno_min,activo,created_at";
}

export function initDB(): void {
  const db = connection();
  db.exec(`
    CREATE TABLE IF NOT EXISTS negocios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      telefono_dueno TEXT NOT NULL,
      evolution_instance TEXT NOT NULL UNIQUE,
      horario_apertura TEXT DEFAULT '09:00',
      horario_cierre TEXT DEFAULT '19:00',
      duracion_turno_min INTEGER DEFAULT 30,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS planes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio_mensual REAL NOT NULL,
      limite_turnos_mes INTEGER,
      descripcion TEXT
    );
    CREATE TABLE IF NOT EXISTS suscripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      plan_id INTEGER NOT NULL REFERENCES planes(id),
      estado TEXT DEFAULT 'activa',
      fecha_inicio TEXT NOT NULL,
      fecha_vencimiento TEXT NOT NULL,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      suscripcion_id INTEGER NOT NULL REFERENCES suscripciones(id),
      monto REAL NOT NULL,
      fecha_pago TEXT NOT NULL,
      metodo TEXT,
      referencia TEXT,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      nombre TEXT NOT NULL,
      duracion_min INTEGER NOT NULL,
      precio REAL NOT NULL,
      activo INTEGER DEFAULT 1,
      orden INTEGER DEFAULT 0,
      UNIQUE(negocio_id, nombre)
    );
    CREATE TABLE IF NOT EXISTS turnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      nombre_cliente TEXT NOT NULL,
      telefono_cliente TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      duracion_min INTEGER NOT NULL,
      servicio_id INTEGER REFERENCES servicios(id),
      servicio_nombre TEXT,
      servicio_precio REAL,
      estado TEXT DEFAULT 'confirmado',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bloqueos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      motivo TEXT
    );
    CREATE TABLE IF NOT EXISTS conversaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER NOT NULL REFERENCES negocios(id),
      telefono_cliente TEXT NOT NULL,
      historial TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(negocio_id, telefono_cliente)
    );
    CREATE TABLE IF NOT EXISTS mensajes_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negocio_id INTEGER,
      telefono TEXT,
      direccion TEXT,
      contenido TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.prepare("INSERT INTO planes (id,nombre,precio_mensual,limite_turnos_mes,descripcion) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET nombre = excluded.nombre, precio_mensual = excluded.precio_mensual, limite_turnos_mes = excluded.limite_turnos_mes, descripcion = excluded.descripcion")
    .run("Plan unico", 30000, null, "Plan mensual sin limites");
  db.prepare("UPDATE suscripciones SET plan_id = 1 WHERE plan_id <> 1").run();
  db.prepare("DELETE FROM planes WHERE id <> 1").run();

  const negocios = db.prepare("SELECT id FROM negocios").all() as Array<{ id: number }>;
  negocios.forEach((negocio) => seedServiciosBaseFor(db, negocio.id));
}

export const db = {
  raw: connection,
  getNegocioById(id: number): Negocio | null { return (connection().prepare("SELECT * FROM negocios WHERE id = ?").get(id) as Negocio | undefined) ?? null; },
  getNegocioByEmail(email: string): Negocio | null { return (connection().prepare("SELECT * FROM negocios WHERE lower(email) = lower(?)").get(email.trim()) as Negocio | undefined) ?? null; },
  getNegocioByInstance(instance: string): Negocio | null { return (connection().prepare("SELECT * FROM negocios WHERE evolution_instance = ?").get(instance) as Negocio | undefined) ?? null; },
  getPublicNegocio(id: number): PublicNegocio | null { return (connection().prepare(`SELECT ${publicNegocioSelect()} FROM negocios WHERE id = ?`).get(id) as PublicNegocio | undefined) ?? null; },
  listNegocios(): PublicNegocio[] { return connection().prepare(`SELECT ${publicNegocioSelect()} FROM negocios ORDER BY created_at DESC`).all() as PublicNegocio[]; },
  createNegocio(input: { nombre: string; email: string; password: string; telefono_dueno: string; evolution_instance: string; horario_apertura?: string; horario_cierre?: string; duracion_turno_min?: number }): PublicNegocio {
    const raw = connection();
    const columns = raw.prepare("PRAGMA table_info(negocios)").all() as Array<{ name: string }>;
    const hasColumn = (name: string) => columns.some((column) => column.name === name);
    const payload: Record<string, string | number> = {
      nombre: input.nombre.trim(),
      email: input.email.trim().toLowerCase(),
      password_hash: bcrypt.hashSync(input.password, 12),
      telefono_dueno: input.telefono_dueno.trim(),
      evolution_instance: input.evolution_instance.trim(),
      horario_apertura: input.horario_apertura ?? "09:00",
      horario_cierre: input.horario_cierre ?? "19:00",
      duracion_turno_min: input.duracion_turno_min ?? 30
    };
    if (hasColumn("whatsapp_phone_id")) payload.whatsapp_phone_id = payload.evolution_instance;
    if (hasColumn("whatsapp_token")) payload.whatsapp_token = "legacy-evolution";
    const keys = Object.keys(payload);
    const result = raw.prepare(`INSERT INTO negocios (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).run(...keys.map((key) => payload[key]));
    const id = Number(result.lastInsertRowid);
    this.seedServiciosBase(id);
    return this.getPublicNegocio(id)!;
  },
  updateNegocio(id: number, input: Partial<Pick<Negocio, "nombre" | "email" | "telefono_dueno" | "evolution_instance" | "horario_apertura" | "horario_cierre" | "duracion_turno_min" | "activo">>): PublicNegocio | null {
    const allowed = Object.entries(input).filter((entry): entry is [string, string | number] => entry[1] !== undefined);
    if (allowed.length) connection().prepare(`UPDATE negocios SET ${allowed.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`).run(...allowed.map(([, value]) => value), id);
    return this.getPublicNegocio(id);
  },
  setNegocioPassword(id: number, password: string): void { connection().prepare("UPDATE negocios SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 12), id); },
  seedServiciosBase(negocioId: number): void {
    seedServiciosBaseFor(connection(), negocioId);
  },
  getServicios(negocioId: number): Servicio[] { return connection().prepare("SELECT * FROM servicios WHERE negocio_id = ? AND activo = 1 ORDER BY orden ASC, nombre ASC").all(negocioId) as Servicio[]; },
  listServicios(negocioId: number): Servicio[] { return connection().prepare("SELECT * FROM servicios WHERE negocio_id = ? ORDER BY activo DESC, orden ASC, nombre ASC").all(negocioId) as Servicio[]; },
  getServicioById(id: number): Servicio | null { return (connection().prepare("SELECT * FROM servicios WHERE id = ?").get(id) as Servicio | undefined) ?? null; },
  getServicioByNombre(negocioId: number, nombre: string): Servicio | null { return (connection().prepare("SELECT * FROM servicios WHERE negocio_id = ? AND lower(nombre) = lower(?)").get(negocioId, nombre) as Servicio | undefined) ?? null; },
  createServicio(negocioId: number, input: { nombre: string; duracion_min: number; precio: number; orden?: number; activo?: number }): Servicio {
    const existing = this.getServicioByNombre(negocioId, input.nombre);
    if (existing) { this.updateServicio(existing.id, input); return this.getServicioById(existing.id)!; }
    const result = connection().prepare("INSERT INTO servicios (negocio_id,nombre,duracion_min,precio,orden,activo) VALUES (?, ?, ?, ?, ?, ?)").run(negocioId, input.nombre, input.duracion_min, input.precio, input.orden ?? 0, input.activo ?? 1);
    return this.getServicioById(Number(result.lastInsertRowid))!;
  },
  updateServicio(id: number, input: Partial<Pick<Servicio, "nombre" | "duracion_min" | "precio" | "orden" | "activo">>): Servicio | null {
    const allowed = Object.entries(input).filter((entry): entry is [string, string | number] => entry[1] !== undefined);
    if (allowed.length) connection().prepare(`UPDATE servicios SET ${allowed.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`).run(...allowed.map(([, value]) => value), id);
    return this.getServicioById(id);
  },
  deleteServicio(id: number): void { connection().prepare("UPDATE servicios SET activo = 0 WHERE id = ?").run(id); },
  listPlanes(): Plan[] { return connection().prepare("SELECT * FROM planes ORDER BY id ASC").all() as Plan[]; },
  getPlan(id: number): Plan | null { return (connection().prepare("SELECT * FROM planes WHERE id = ?").get(id) as Plan | undefined) ?? null; },
  createPlan(input: Omit<Plan, "id">): Plan {
    const result = connection().prepare("INSERT INTO planes (nombre,precio_mensual,limite_turnos_mes,descripcion) VALUES (?, ?, ?, ?)").run(input.nombre, input.precio_mensual, input.limite_turnos_mes, input.descripcion);
    return this.getPlan(Number(result.lastInsertRowid))!;
  },
  updatePlan(id: number, input: Partial<Omit<Plan, "id">>): Plan | null {
    const allowed = Object.entries(input).filter((entry): entry is [string, string | number | null] => entry[1] !== undefined);
    if (allowed.length) connection().prepare(`UPDATE planes SET ${allowed.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`).run(...allowed.map(([, value]) => value), id);
    return this.getPlan(id);
  },
  getSuscripcionActiva(negocioId: number): SuscripcionConPlan | null { return (connection().prepare("SELECT s.*, p.nombre plan_nombre, p.precio_mensual, p.limite_turnos_mes, p.descripcion FROM suscripciones s JOIN planes p ON p.id = s.plan_id WHERE s.negocio_id = ? AND s.estado = 'activa' ORDER BY s.fecha_vencimiento DESC LIMIT 1").get(negocioId) as SuscripcionConPlan | undefined) ?? null; },
  listSuscripciones(negocioId: number): SuscripcionConPlan[] { return connection().prepare("SELECT s.*, p.nombre plan_nombre, p.precio_mensual, p.limite_turnos_mes, p.descripcion FROM suscripciones s JOIN planes p ON p.id = s.plan_id WHERE s.negocio_id = ? ORDER BY s.fecha_inicio DESC").all(negocioId) as SuscripcionConPlan[]; },
  createSuscripcion(input: { negocio_id: number; plan_id: number; fecha_inicio: string; fecha_vencimiento: string; notas?: string | null }): Suscripcion {
    const result = connection().prepare("INSERT INTO suscripciones (negocio_id,plan_id,fecha_inicio,fecha_vencimiento,notas) VALUES (?, ?, ?, ?, ?)").run(input.negocio_id, input.plan_id, input.fecha_inicio, input.fecha_vencimiento, input.notas ?? null);
    return connection().prepare("SELECT * FROM suscripciones WHERE id = ?").get(result.lastInsertRowid) as Suscripcion;
  },
  updateSuscripcionesEstado(negocioId: number, current: SuscripcionEstado | null, next: SuscripcionEstado): void {
    if (current) connection().prepare("UPDATE suscripciones SET estado = ? WHERE negocio_id = ? AND estado = ?").run(next, negocioId, current);
    else connection().prepare("UPDATE suscripciones SET estado = ? WHERE negocio_id = ?").run(next, negocioId);
  },
  updateSuscripcion(id: number, input: Partial<Pick<Suscripcion, "plan_id" | "estado" | "fecha_inicio" | "fecha_vencimiento" | "notas">>): SuscripcionConPlan | null {
    const allowed = Object.entries(input).filter((entry): entry is [string, string | number | null] => entry[1] !== undefined);
    if (allowed.length) connection().prepare(`UPDATE suscripciones SET ${allowed.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`).run(...allowed.map(([, value]) => value), id);
    return (connection().prepare("SELECT s.*, p.nombre plan_nombre, p.precio_mensual, p.limite_turnos_mes, p.descripcion FROM suscripciones s JOIN planes p ON p.id = s.plan_id WHERE s.id = ?").get(id) as SuscripcionConPlan | undefined) ?? null;
  },
  listPagosGlobal(desde: string, hasta: string): PagoConNegocio[] { return connection().prepare("SELECT p.*, n.nombre negocio_nombre, n.email negocio_email FROM pagos p JOIN negocios n ON n.id = p.negocio_id WHERE p.fecha_pago BETWEEN ? AND ? ORDER BY p.fecha_pago DESC, p.id DESC").all(desde, hasta) as PagoConNegocio[]; },
  getContabilidad(desde: string, hasta: string): { peluquerias_activas: number; ingresos_periodo: number; facturacion_mensual_esperada: number; pagos: PagoConNegocio[] } {
    const active = (connection().prepare("SELECT COUNT(*) total FROM negocios WHERE activo = 1").get() as { total: number }).total;
    const ingresos = (connection().prepare("SELECT COALESCE(SUM(monto), 0) total FROM pagos WHERE fecha_pago BETWEEN ? AND ?").get(desde, hasta) as { total: number }).total;
    return { peluquerias_activas: active, ingresos_periodo: ingresos, facturacion_mensual_esperada: active * 30000, pagos: this.listPagosGlobal(desde, hasta) };
  },
  listPagos(negocioId: number): Pago[] { return connection().prepare("SELECT * FROM pagos WHERE negocio_id = ? ORDER BY fecha_pago DESC, id DESC").all(negocioId) as Pago[]; },
  createPago(input: Omit<Pago, "id" | "created_at">): Pago {
    const result = connection().prepare("INSERT INTO pagos (negocio_id,suscripcion_id,monto,fecha_pago,metodo,referencia,notas) VALUES (?, ?, ?, ?, ?, ?, ?)").run(input.negocio_id, input.suscripcion_id, input.monto, input.fecha_pago, input.metodo, input.referencia, input.notas);
    return connection().prepare("SELECT * FROM pagos WHERE id = ?").get(result.lastInsertRowid) as Pago;
  },
  listTurnos(negocioId: number, desde: string, hasta: string): Turno[] { return connection().prepare("SELECT * FROM turnos WHERE negocio_id = ? AND fecha BETWEEN ? AND ? ORDER BY fecha ASC, hora ASC").all(negocioId, desde, hasta) as Turno[]; },
  createTurno(input: Omit<Turno, "id" | "estado" | "created_at">): Turno {
    const result = connection().prepare("INSERT INTO turnos (negocio_id,nombre_cliente,telefono_cliente,fecha,hora,duracion_min,servicio_id,servicio_nombre,servicio_precio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(input.negocio_id, input.nombre_cliente, input.telefono_cliente, input.fecha, input.hora, input.duracion_min, input.servicio_id, input.servicio_nombre, input.servicio_precio);
    return connection().prepare("SELECT * FROM turnos WHERE id = ?").get(result.lastInsertRowid) as Turno;
  },
  cancelTurno(negocioId: number, turnoId: number): void { connection().prepare("UPDATE turnos SET estado = 'cancelado' WHERE negocio_id = ? AND id = ?").run(negocioId, turnoId); },
  countTurnosConfirmados(negocioId: number, desde: string, hasta: string): number { return (connection().prepare("SELECT COUNT(*) total FROM turnos WHERE negocio_id = ? AND estado = 'confirmado' AND fecha BETWEEN ? AND ?").get(negocioId, desde, hasta) as { total: number }).total; },
  listBloqueos(negocioId: number): Bloqueo[] { return connection().prepare("SELECT * FROM bloqueos WHERE negocio_id = ? AND fecha_fin >= datetime('now') ORDER BY fecha_inicio ASC").all(negocioId) as Bloqueo[]; },
  createBloqueo(input: Omit<Bloqueo, "id">): Bloqueo {
    const result = connection().prepare("INSERT INTO bloqueos (negocio_id,fecha_inicio,fecha_fin,motivo) VALUES (?, ?, ?, ?)").run(input.negocio_id, input.fecha_inicio, input.fecha_fin, input.motivo);
    return connection().prepare("SELECT * FROM bloqueos WHERE id = ?").get(result.lastInsertRowid) as Bloqueo;
  },
  deleteBloqueo(negocioId: number, id: number): void { connection().prepare("DELETE FROM bloqueos WHERE negocio_id = ? AND id = ?").run(negocioId, id); },
  getConversacion(negocioId: number, telefono: string): Conversacion | null { return (connection().prepare("SELECT * FROM conversaciones WHERE negocio_id = ? AND telefono_cliente = ?").get(negocioId, telefono) as Conversacion | undefined) ?? null; },
  upsertConversacion(negocioId: number, telefono: string, historial: string): void { connection().prepare("INSERT INTO conversaciones (negocio_id,telefono_cliente,historial,updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(negocio_id,telefono_cliente) DO UPDATE SET historial = excluded.historial, updated_at = datetime('now')").run(negocioId, telefono, historial); },
  logMensaje(negocioId: number | null, telefono: string | null, direccion: "entrante" | "saliente", contenido: string): void { connection().prepare("INSERT INTO mensajes_log (negocio_id,telefono,direccion,contenido) VALUES (?, ?, ?, ?)").run(negocioId, telefono, direccion, contenido); },
  listMensajes(negocioId: number, limit = 50): MensajeLog[] { return connection().prepare("SELECT * FROM mensajes_log WHERE negocio_id = ? ORDER BY id DESC LIMIT ?").all(negocioId, limit) as MensajeLog[]; },
  listClientesMarketing(negocioId: number, diasSinContacto: number): ClienteMarketing[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - diasSinContacto);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const clientes = connection().prepare(`
      SELECT
        t.telefono_cliente telefono,
        COALESCE((SELECT tt.nombre_cliente FROM turnos tt WHERE tt.negocio_id = t.negocio_id AND tt.telefono_cliente = t.telefono_cliente ORDER BY tt.fecha DESC, tt.hora DESC LIMIT 1), t.nombre_cliente) nombre,
        MAX(t.fecha) ultimo_turno,
        MAX(CASE WHEN m.direccion = 'entrante' THEN substr(m.created_at, 1, 10) ELSE NULL END) ultimo_mensaje,
        COUNT(t.id) total_turnos,
        SUM(CASE WHEN t.estado = 'confirmado' THEN COALESCE(t.servicio_precio, 0) ELSE 0 END) total_gastado
      FROM turnos t
      LEFT JOIN mensajes_log m ON m.negocio_id = t.negocio_id AND m.telefono = t.telefono_cliente
      WHERE t.negocio_id = ?
      GROUP BY t.telefono_cliente
      HAVING COALESCE(ultimo_mensaje, ultimo_turno) <= ?
      ORDER BY COALESCE(ultimo_mensaje, ultimo_turno) ASC
    `).all(negocioId, cutoffDate) as ClienteMarketing[];
    return clientes;
  }
};
