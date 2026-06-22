import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, DollarSign, Scissors, Store, TrendingUp } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";

interface AdminStats {
  total_negocios: number;
  negocios_activos: number;
  negocios_suspendidos: number;
  ingresos_mes_actual: number;
  turnos_procesados_mes: number;
  suscripciones_por_vencer: Array<{ id: number; nombre: string; dias_restantes: number }>;
  negocios_sin_suscripcion: Array<{ id: number; nombre: string }>;
}

function Metric({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: typeof Store; hint?: string }) {
  return (
    <article className="flex h-32 flex-col justify-between rounded-lg border border-[#c4c7c7] bg-white p-6">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase text-[#444748]">{label}</span>
        <Icon size={20} className="text-[#747878]" />
      </div>
      <div>
        <div className="text-4xl font-bold text-black">{value}</div>
        {hint ? <div className="mt-1 text-sm text-[#444748]">{hint}</div> : null}
      </div>
    </article>
  );
}

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState<AdminStats | null>(null);
  useEffect(() => {
    api<AdminStats>("/api/superadmin/stats").then(setStats).catch(console.error);
  }, [api]);

  return (
    <Layout mode="admin">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black md:text-4xl">Panel general</h1>
          <p className="mt-1 text-base text-[#444748]">Estado comercial y operativo de las peluquerias.</p>
        </div>
        <Link to="/admin/negocios" className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#474746]">
          <Scissors size={17} /> Administrar peluquerias
        </Link>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Metric label="Peluquerias" value={stats?.total_negocios ?? "-"} hint={`${stats?.negocios_activos ?? 0} activas`} icon={Store} />
        <Metric label="Suspendidas" value={stats?.negocios_suspendidos ?? "-"} icon={CalendarClock} />
        <Metric label="Ingresos mes" value={`$${stats?.ingresos_mes_actual ?? 0}`} icon={DollarSign} />
        <Metric label="Turnos mes" value={stats?.turnos_procesados_mes ?? "-"} icon={TrendingUp} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-[#c4c7c7] bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-black">Suscripciones por vencer</h2>
          <div className="divide-y divide-[#c4c7c7]">
            {(stats?.suscripciones_por_vencer ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-black">{item.nombre}</span>
                <Link className="rounded-full bg-[#eeeeee] px-3 py-1 font-semibold text-black" to={`/admin/negocios/${item.id}`}>{item.dias_restantes} dias</Link>
              </div>
            ))}
            {!(stats?.suscripciones_por_vencer ?? []).length ? <div className="py-8 text-center text-sm text-[#444748]">No hay vencimientos cercanos</div> : null}
          </div>
        </article>

        <article className="rounded-lg border border-[#c4c7c7] bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-black">Sin suscripcion activa</h2>
          <div className="divide-y divide-[#c4c7c7]">
            {(stats?.negocios_sin_suscripcion ?? []).map((item) => (
              <Link key={item.id} className="flex items-center justify-between py-3 text-sm text-black hover:text-[#735c00]" to={`/admin/negocios/${item.id}`}>
                <span className="font-medium">{item.nombre}</span>
                <span>Ver detalle</span>
              </Link>
            ))}
            {!(stats?.negocios_sin_suscripcion ?? []).length ? <div className="py-8 text-center text-sm text-[#444748]">Todas las peluquerias tienen plan</div> : null}
          </div>
        </article>
      </section>
    </Layout>
  );
}
