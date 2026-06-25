import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import PlanBadge from "../../components/PlanBadge";
import ServiciosTable from "../../components/ServiciosTable";
import TurnoRow from "../../components/TurnoRow";
import { useApi } from "../../hooks/useApi";
import type { MensajeLog, Negocio, Pago, Plan, Suscripcion, Turno } from "../../types";

interface Detalle {
  negocio: Negocio;
  suscripcion: Suscripcion | null;
  suscripciones: Suscripcion[];
  pagos: Pago[];
  turnos_mes: Turno[];
  mensajes: MensajeLog[];
  dias_restantes: number;
}

const tabList = ["info", "suscripción", "pagos", "turnos", "servicios", "log"] as const;
type Tab = (typeof tabList)[number];

function money(v: number): string {
  return `$${Number(v || 0).toLocaleString("es-AR")}`;
}

export default function NegocioDetalle() {
  const { id } = useParams();
  const api = useApi();
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tab, setTab] = useState<Tab>("info");
  const load = () => {
    api<Detalle>(`/api/superadmin/negocios/${id}`).then(setDetalle).catch(console.error);
    api<Plan[]>("/api/superadmin/planes").then(setPlanes).catch(console.error);
  };
  useEffect(load, [api, id]);

  async function renew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api(`/api/superadmin/negocios/${id}/suscripcion`, { method: "POST", body: JSON.stringify({ plan_id: Number(data.plan_id), meses: Number(data.meses) }) });
    load();
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detalle?.suscripcion) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api(`/api/superadmin/negocios/${id}/pagos`, { method: "POST", body: JSON.stringify({ ...data, suscripcion_id: detalle.suscripcion.id, monto: Number(data.monto) }) });
    load();
  }

  const ingresosMes = useMemo(() => detalle?.pagos.reduce((t, p) => t + p.monto, 0) ?? 0, [detalle?.pagos]);
  const progreso = Math.min(100, (detalle?.dias_restantes ?? 0) * 3);

  if (!detalle) return (
    <Layout mode="admin">
      <div className="flex h-64 items-center justify-center text-[#444748]">Cargando...</div>
    </Layout>
  );

  return (
    <Layout mode="admin">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black md:text-4xl">{detalle.negocio.nombre}</h1>
          <p className="mt-1 text-sm text-[#444748]">{detalle.negocio.email}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${detalle.negocio.activo ? "bg-emerald-50 text-emerald-700" : "bg-[#eeeeee] text-[#444748]"}`}>
          <span className={`h-2 w-2 rounded-full ${detalle.negocio.activo ? "bg-emerald-500" : "bg-[#c4c7c7]"}`} />
          {detalle.negocio.activo ? "Activo" : "Suspendido"}
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#c4c7c7] bg-[#eeeeee] p-1">
        {tabList.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${tab === item ? "bg-white text-black shadow-sm" : "text-[#444748] hover:bg-[#e8e8e8]"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Info */}
      {tab === "info" && (
        <section className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
          <div className="border-b border-[#c4c7c7] bg-[#f9f9f9] px-6 py-4 text-sm font-semibold uppercase tracking-wider text-[#444748]">Datos del negocio</div>
          <div className="grid gap-4 p-6 md:grid-cols-2">
            {[
              ["Email", detalle.negocio.email],
              ["Teléfono dueño", detalle.negocio.telefono_dueno],
              ["Evolution Instance", detalle.negocio.evolution_instance],
              ["Horario", `${detalle.negocio.horario_apertura} – ${detalle.negocio.horario_cierre}`],
              ["Bloque turno", `${detalle.negocio.duracion_turno_min} min`],
              ["Alta", detalle.negocio.created_at?.slice(0, 10)],
              ["Turnos del mes", String(detalle.turnos_mes.length)],
              ["Días restantes", String(detalle.dias_restantes)]
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#444748]">{label}</span>
                <span className="font-semibold text-black">{value ?? "–"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suscripción */}
      {tab === "suscripción" && (
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-[#c4c7c7] bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <PlanBadge estado={detalle.suscripcion?.estado} plan={detalle.suscripcion?.plan_nombre} />
              <span className="text-sm text-[#444748]">Vence: <strong>{detalle.suscripcion?.fecha_vencimiento ?? "–"}</strong></span>
            </div>
            <div className="mb-1 text-xs font-semibold text-[#444748]">Vigencia</div>
            <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#eeeeee]">
              <div className="h-2 rounded-full bg-black transition-all" style={{ width: `${progreso}%` }} />
            </div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#444748]">Historial</h3>
            <div className="space-y-2">
              {detalle.suscripciones.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] px-4 py-3 text-sm">
                  <span className="font-semibold text-black">{s.plan_nombre}</span>
                  <span className="text-[#444748]">{s.fecha_inicio} / {s.fecha_vencimiento}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.estado === "activa" ? "bg-emerald-50 text-emerald-700" : "bg-[#eeeeee] text-[#444748]"}`}>{s.estado}</span>
                </div>
              ))}
              {!detalle.suscripciones.length && <p className="text-sm text-[#444748]">Sin suscripciones registradas.</p>}
            </div>
          </div>
          <form onSubmit={renew} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-black">Renovar suscripción</h3>
            <label className="mb-3 block text-sm font-medium text-[#444748]">Plan
              <select className="input mt-1" name="plan_id">
                {planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}
              </select>
            </label>
            <label className="mb-4 block text-sm font-medium text-[#444748]">Meses
              <input className="input mt-1" name="meses" type="number" min={1} defaultValue={1} />
            </label>
            <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-[#474746]">Renovar</button>
          </form>
        </section>
      )}

      {/* Pagos */}
      {tab === "pagos" && (
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
            <div className="flex items-center justify-between border-b border-[#c4c7c7] bg-[#f9f9f9] px-6 py-4">
              <span className="text-sm font-semibold text-black">Movimientos</span>
              <span className="text-sm font-bold text-black">{money(ingresosMes)} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f9f9f9] text-xs uppercase text-[#444748]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c4c7c7]">
                  {detalle.pagos.map((p) => (
                    <tr key={p.id} className="hover:bg-[#f9f9f9]">
                      <td className="px-4 py-3">{p.fecha_pago}</td>
                      <td className="px-4 py-3 font-semibold text-black">{money(p.monto)}</td>
                      <td className="px-4 py-3 text-[#444748]">{p.metodo ?? "–"}</td>
                      <td className="px-4 py-3 text-[#444748]">{p.referencia ?? "–"}</td>
                    </tr>
                  ))}
                  {!detalle.pagos.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-[#444748]">Sin pagos registrados</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <form onSubmit={pay} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-black">Registrar pago</h3>
            <label className="mb-3 block text-sm font-medium text-[#444748]">Monto
              <input className="input mt-1" name="monto" type="number" placeholder="30000" required />
            </label>
            <label className="mb-3 block text-sm font-medium text-[#444748]">Fecha
              <input className="input mt-1" name="fecha_pago" type="date" required />
            </label>
            <label className="mb-3 block text-sm font-medium text-[#444748]">Método
              <input className="input mt-1" name="metodo" placeholder="Transferencia, efectivo..." />
            </label>
            <label className="mb-4 block text-sm font-medium text-[#444748]">Referencia
              <input className="input mt-1" name="referencia" placeholder="N° comprobante..." />
            </label>
            <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-[#474746]">Guardar pago</button>
          </form>
        </section>
      )}

      {/* Turnos */}
      {tab === "turnos" && (
        <div className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
          <div className="border-b border-[#c4c7c7] bg-[#f9f9f9] px-6 py-4 text-sm font-semibold text-black">Turnos del mes ({detalle.turnos_mes.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f9f9f9] text-xs uppercase text-[#444748]">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c7c7]">
                {detalle.turnos_mes.map((turno) => <TurnoRow key={turno.id} turno={turno} />)}
                {!detalle.turnos_mes.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-[#444748]">Sin turnos este mes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Servicios */}
      {tab === "servicios" && (
        <ServiciosTable endpoint={`/api/superadmin/negocios/${id}/servicios`} />
      )}

      {/* Log */}
      {tab === "log" && (
        <div className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
          <div className="border-b border-[#c4c7c7] bg-[#f9f9f9] px-6 py-4 text-sm font-semibold text-black">Log de mensajes ({detalle.mensajes.length})</div>
          <div className="divide-y divide-[#c4c7c7]">
            {detalle.mensajes.map((m) => (
              <div key={m.id} className={`flex gap-3 px-6 py-3 text-sm ${m.direccion === "saliente" ? "bg-white" : "bg-[#f9f9f9]"}`}>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${m.direccion === "saliente" ? "bg-black text-white" : "bg-[#eeeeee] text-[#444748]"}`}>{m.direccion}</span>
                <span className="text-[#444748]">{m.telefono}</span>
                <span className="flex-1 text-black">{m.contenido}</span>
                <span className="shrink-0 text-xs text-[#747878]">{m.created_at?.slice(11, 16)}</span>
              </div>
            ))}
            {!detalle.mensajes.length && <div className="px-6 py-10 text-center text-sm text-[#444748]">Sin mensajes registrados</div>}
          </div>
        </div>
      )}
    </Layout>
  );
}
