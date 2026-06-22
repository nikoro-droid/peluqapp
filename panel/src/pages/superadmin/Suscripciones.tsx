import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, DollarSign, Plus, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { ContabilidadResumen, Negocio, Plan } from "../../types";

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

function money(value: number): string {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function Metric({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: typeof DollarSign; hint?: string }) {
  return (
    <article className="flex h-32 flex-col justify-between rounded-lg border border-[#c4c7c7] bg-white p-6">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase text-[#444748]">{label}</span>
        <Icon size={20} className="text-[#747878]" />
      </div>
      <div>
        <div className="text-3xl font-bold text-black md:text-4xl">{value}</div>
        {hint ? <div className="mt-1 text-sm text-[#444748]">{hint}</div> : null}
      </div>
    </article>
  );
}

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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black md:text-4xl">Contabilidad</h1>
          <p className="mt-1 text-base text-[#444748]">Cobros, facturacion esperada y plan unico mensual.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#c4c7c7] bg-white px-4 py-2 text-sm font-semibold text-black">
          <WalletCards size={17} /> {planes[0]?.nombre ?? "Plan unico"}: $30000
        </div>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Metric label="Peluquerias activas" value={data?.peluquerias_activas ?? 0} icon={ReceiptText} />
        <Metric label="Facturacion esperada" value={money(data?.facturacion_mensual_esperada ?? 0)} icon={TrendingUp} />
        <Metric label="Cobrado" value={money(data?.ingresos_periodo ?? 0)} icon={DollarSign} />
        <Metric label="Pendiente estimado" value={money(pendiente)} icon={CalendarDays} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-lg border border-[#c4c7c7] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#c4c7c7] bg-[#eeeeee] px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black">Movimientos</h2>
              <p className="mt-1 text-sm text-[#444748]">Pagos registrados en el periodo seleccionado.</p>
            </div>
            <div className="flex gap-3">
              <label className="text-xs font-semibold uppercase text-[#444748]">Desde<input className="input mt-1 bg-white" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
              <label className="text-xs font-semibold uppercase text-[#444748]">Hasta<input className="input mt-1 bg-white" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f9f9f9] text-xs uppercase text-[#444748]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Peluqueria</th><th className="px-4 py-3">Monto</th><th className="px-4 py-3">Metodo</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Notas</th></tr></thead>
              <tbody className="divide-y divide-[#c4c7c7] text-sm">
                {data?.pagos.map((pago) => <tr key={pago.id} className="hover:bg-[#f9f9f9]"><td className="px-4 py-4">{pago.fecha_pago}</td><td className="px-4 py-4 font-semibold text-black">{pago.negocio_nombre}</td><td className="px-4 py-4 font-semibold">{money(pago.monto)}</td><td className="px-4 py-4 text-[#444748]">{pago.metodo ?? "-"}</td><td className="px-4 py-4 text-[#444748]">{pago.referencia ?? "-"}</td><td className="px-4 py-4 text-[#444748]">{pago.notas ?? "-"}</td></tr>)}
                {!data?.pagos.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[#444748]">No hay pagos en este periodo</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={createPago} className="rounded-lg border border-[#c4c7c7] bg-white p-6">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold text-black"><DollarSign size={20} /> Registrar cobro</h2>
          <p className="mb-5 text-sm text-[#444748]">Carga un pago manual para una peluqueria.</p>
          <select className="input mb-3 bg-[#f9f9f9]" name="negocio_id" required>
            <option value="">Peluqueria</option>
            {peluquerias.map((negocio) => <option key={negocio.id} value={negocio.id}>{negocio.nombre}</option>)}
          </select>
          <input className="input mb-3 bg-[#f9f9f9]" name="monto" type="number" defaultValue={30000} min={1} required />
          <input className="input mb-3 bg-[#f9f9f9]" name="fecha_pago" type="date" defaultValue={today} required />
          <input className="input mb-3 bg-[#f9f9f9]" name="metodo" placeholder="Metodo" />
          <input className="input mb-3 bg-[#f9f9f9]" name="referencia" placeholder="Referencia" />
          <textarea className="input mb-4 min-h-24 bg-[#f9f9f9]" name="notas" placeholder="Notas" />
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#474746]"><Plus size={17} /> Registrar</button>
        </form>
      </div>
    </Layout>
  );
}
