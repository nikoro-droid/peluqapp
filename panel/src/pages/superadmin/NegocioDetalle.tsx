import { FormEvent, useEffect, useState } from "react";
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

export default function NegocioDetalle() {
  const { id } = useParams();
  const api = useApi();
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tab, setTab] = useState("info");
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

  if (!detalle) return <Layout mode="admin"><div>Cargando...</div></Layout>;
  const tabs = ["info", "suscripción", "pagos", "turnos", "servicios", "log"];
  return (
    <Layout mode="admin">
      <h1 className="mb-4 text-xl font-semibold">{detalle.negocio.nombre}</h1>
      <div className="mb-4 flex gap-2">{tabs.map((item) => <button key={item} className={`btn ${tab === item ? "btn-primary" : "btn-muted"}`} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === "info" ? (
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div><b>Email:</b> {detalle.negocio.email}</div>
            <div><b>Dueño:</b> {detalle.negocio.telefono_dueno}</div>
            <div><b>Evolution Instance:</b> {detalle.negocio.evolution_instance}</div>
            <div><b>Horario:</b> {detalle.negocio.horario_apertura} - {detalle.negocio.horario_cierre}</div>
            <div><b>Duración:</b> {detalle.negocio.duracion_turno_min} min</div>
          </div>
        </section>
      ) : null}
      {tab === "suscripción" ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-line bg-white p-4">
            <PlanBadge estado={detalle.suscripcion?.estado} plan={detalle.suscripcion?.plan_nombre} />
            <div className="mt-3 text-sm">Vence: {detalle.suscripcion?.fecha_vencimiento ?? "-"}</div>
            <div className="mt-2 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-brand" style={{ width: `${Math.min(100, detalle.dias_restantes * 3)}%` }} /></div>
            <h3 className="mt-5 font-semibold">Historial</h3>
            {detalle.suscripciones.map((suscripcion) => <div key={suscripcion.id} className="border-t border-line py-2 text-sm">{suscripcion.plan_nombre} - {suscripcion.estado} - {suscripcion.fecha_inicio} / {suscripcion.fecha_vencimiento}</div>)}
          </div>
          <form onSubmit={renew} className="rounded-lg border border-line bg-white p-4">
            <h3 className="mb-3 font-semibold">Renovar</h3>
            <select className="input mb-3" name="plan_id">{planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}</select>
            <input className="input mb-3" name="meses" type="number" min={1} defaultValue={1} />
            <button className="btn btn-primary w-full">Renovar</button>
          </form>
        </section>
      ) : null}
      {tab === "pagos" ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-lg border border-line bg-white"><table className="table w-full"><tbody>{detalle.pagos.map((pago) => <tr key={pago.id}><td>{pago.fecha_pago}</td><td>${pago.monto}</td><td>{pago.metodo}</td><td>{pago.referencia}</td></tr>)}</tbody></table></div>
          <form onSubmit={pay} className="rounded-lg border border-line bg-white p-4">
            <h3 className="mb-3 font-semibold">Registrar pago</h3>
            <input className="input mb-3" name="monto" type="number" placeholder="Monto" required />
            <input className="input mb-3" name="fecha_pago" type="date" required />
            <input className="input mb-3" name="metodo" placeholder="Método" />
            <input className="input mb-3" name="referencia" placeholder="Referencia" />
            <button className="btn btn-primary w-full">Guardar</button>
          </form>
        </section>
      ) : null}
      {tab === "turnos" ? <div className="overflow-hidden rounded-lg border border-line bg-white"><table className="table w-full"><tbody>{detalle.turnos_mes.map((turno) => <TurnoRow key={turno.id} turno={turno} />)}</tbody></table></div> : null}
      {tab === "servicios" ? <ServiciosTable endpoint={`/api/superadmin/negocios/${id}/servicios`} /> : null}
      {tab === "log" ? <div className="rounded-lg border border-line bg-white p-4">{detalle.mensajes.map((m) => <div key={m.id} className="border-t border-line py-2 text-sm"><b>{m.direccion}</b> {m.telefono}: {m.contenido}</div>)}</div> : null}
    </Layout>
  );
}
