import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import StatCard from "../../components/StatCard";
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

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState<AdminStats | null>(null);
  useEffect(() => {
    api<AdminStats>("/api/superadmin/stats").then(setStats).catch(console.error);
  }, [api]);
  return (
    <Layout mode="admin">
      <h1 className="mb-5 text-xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Negocios" value={stats?.total_negocios ?? "-"} hint={`${stats?.negocios_activos ?? 0} activos`} />
        <StatCard label="Suspendidos" value={stats?.negocios_suspendidos ?? "-"} />
        <StatCard label="Ingresos mes" value={`$${stats?.ingresos_mes_actual ?? 0}`} />
        <StatCard label="Turnos mes" value={stats?.turnos_procesados_mes ?? "-"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Suscripciones por vencer</h2>
          {(stats?.suscripciones_por_vencer ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between border-t border-line py-2 text-sm">
              <span>{item.nombre}</span>
              <Link className="text-brand" to={`/admin/negocios/${item.id}`}>
                {item.dias_restantes} días
              </Link>
            </div>
          ))}
        </section>
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Sin suscripción activa</h2>
          {(stats?.negocios_sin_suscripcion ?? []).map((item) => (
            <Link key={item.id} className="block border-t border-line py-2 text-sm text-brand" to={`/admin/negocios/${item.id}`}>
              {item.nombre}
            </Link>
          ))}
        </section>
      </div>
    </Layout>
  );
}
