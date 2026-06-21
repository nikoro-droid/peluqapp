import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import StatCard from "../../components/StatCard";
import { useApi } from "../../hooks/useApi";

interface Stats {
  turnos_hoy: number;
  turnos_semana: number;
  turnos_mes: number;
  turnos_usados_mes: number;
  limite_turnos_mes: number | null;
  porcentaje_uso: number;
  dias_restantes_suscripcion: number;
  estado_suscripcion: string;
  nombre_plan: string | null;
}

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    api<Stats>("/api/negocio/stats").then(setStats).catch(console.error);
  }, [api]);
  const alert = (stats?.dias_restantes_suscripcion ?? 99) <= 7 || (stats?.porcentaje_uso ?? 0) >= 90;
  return (
    <Layout mode="negocio">
      <h1 className="mb-5 text-xl font-semibold">Dashboard</h1>
      {alert ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Revisá el estado de tu plan.</div> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Plan" value={stats?.nombre_plan ?? "Sin plan"} hint={`${stats?.dias_restantes_suscripcion ?? 0} días restantes`} />
        <StatCard label="Uso mensual" value={`${stats?.turnos_usados_mes ?? 0}/${stats?.limite_turnos_mes ?? "∞"}`} />
        <StatCard label="Turnos hoy" value={stats?.turnos_hoy ?? "-"} />
        <StatCard label="Próximos 7 días" value={stats?.turnos_semana ?? "-"} />
      </div>
      <div className="mt-6 rounded-lg border border-line bg-white p-4">
        <div className="mb-2 flex justify-between text-sm"><span>Uso del plan</span><span>{stats?.porcentaje_uso ?? 0}%</span></div>
        <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-brand" style={{ width: `${Math.min(100, stats?.porcentaje_uso ?? 0)}%` }} /></div>
      </div>
    </Layout>
  );
}
