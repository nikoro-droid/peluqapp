import { FormEvent, useEffect, useMemo, useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { ContabilidadResumen, Negocio, Plan } from "../../types";

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function Suscripciones() {
  const api = useApi();
  const [data, setData] = useState<ContabilidadResumen | null>(null);
  const [peluquerias, setPeluquerias] = useState<Negocio[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [desde, setDesde] = useState(monthStart);
  const [hasta, setHasta] = useState(today);

  const pendiente = useMemo(() => Math.max(0, (data?.facturacion_mensual_esperada ?? 0) - (data?.ingresos_periodo ?? 0)), [data]);

  const load = () => {
    void api<ContabilidadResumen>(`/api/superadmin/contabilidad?desde=${desde}&hasta=${hasta}`).then(setData).catch(console.error);
    void api<Negocio[]>("/api/superadmin/negocios").then(setPeluquerias).catch(console.error);
    void api<Plan[]>("/api/superadmin/planes").then(setPlanes).catch(console.error);
  };

  useEffect(load, [api, desde, hasta]);

  async function createPago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    await api("/api/superadmin/pagos", {
      method: "POST",
      body: JSON.stringify({
        negocio_id: Number(raw.negocio_id),
        monto: Number(raw.monto),
        fecha_pago: raw.fecha_pago,
        metodo: raw.metodo,
        referencia: raw.referencia,
        notas: raw.notas
      })
    });
    form.reset();
    load();
  }

  return (
    <Layout mode="admin">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contabilidad</h1>
          <p className="mt-1 text-sm text-slate-500">Plan unico sin limites: $30000 mensual</p>
        </div>
        <div className="rounded-full bg-teal-50 px-3 py-2 text-sm font-medium text-brand">{planes[0]?.nombre ?? "Plan unico"}</div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-4"><div className="text-xs uppercase text-slate-500">Peluquerias activas</div><div className="mt-2 text-2xl font-semibold">{data?.peluquerias_activas ?? 0}</div></div>
        <div className="rounded-lg border border-line bg-white p-4"><div className="text-xs uppercase text-slate-500">Facturacion esperada</div><div className="mt-2 text-2xl font-semibold">${data?.facturacion_mensual_esperada ?? 0}</div></div>
        <div className="rounded-lg border border-line bg-white p-4"><div className="text-xs uppercase text-slate-500">Cobrado</div><div className="mt-2 text-2xl font-semibold">${data?.ingresos_periodo ?? 0}</div></div>
        <div className="rounded-lg border border-line bg-white p-4"><div className="text-xs uppercase text-slate-500">Pendiente estimado</div><div className="mt-2 text-2xl font-semibold">${pendiente}</div></div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-sm font-medium text-slate-700">Desde<input className="input mt-1" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
            <label className="text-sm font-medium text-slate-700">Hasta<input className="input mt-1" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
          </div>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="table w-full">
              <thead><tr><th>Fecha</th><th>Peluqueria</th><th>Monto</th><th>Metodo</th><th>Referencia</th><th>Notas</th></tr></thead>
              <tbody>
                {data?.pagos.map((pago) => <tr key={pago.id}><td>{pago.fecha_pago}</td><td>{pago.negocio_nombre}</td><td>${pago.monto}</td><td>{pago.metodo ?? "-"}</td><td>{pago.referencia ?? "-"}</td><td>{pago.notas ?? "-"}</td></tr>)}
                {!data?.pagos.length ? <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay pagos en este periodo</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={createPago} className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><DollarSign size={18} /> Registrar cobro</h2>
          <select className="input mb-3" name="negocio_id" required>
            <option value="">Peluqueria</option>
            {peluquerias.map((negocio) => <option key={negocio.id} value={negocio.id}>{negocio.nombre}</option>)}
          </select>
          <input className="input mb-3" name="monto" type="number" defaultValue={30000} min={1} required />
          <input className="input mb-3" name="fecha_pago" type="date" defaultValue={today} required />
          <input className="input mb-3" name="metodo" placeholder="Metodo" />
          <input className="input mb-3" name="referencia" placeholder="Referencia" />
          <textarea className="input mb-3" name="notas" placeholder="Notas" />
          <button className="btn btn-primary w-full"><Plus size={16} /> Registrar</button>
        </form>
      </div>
    </Layout>
  );
}
