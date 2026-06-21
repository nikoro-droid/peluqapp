import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { Pago, Suscripcion as SuscripcionType } from "../../types";

interface Data {
  suscripcion: SuscripcionType | null;
  dias_restantes: number;
  turnos_usados_mes: number;
  pagos: Pago[];
}

export default function Suscripcion() {
  const api = useApi();
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    api<Data>("/api/negocio/suscripcion").then(setData).catch(console.error);
  }, [api]);
  const limit = data?.suscripcion?.limite_turnos_mes ?? null;
  const percent = limit ? Math.min(100, Math.round(((data?.turnos_usados_mes ?? 0) / limit) * 100)) : 0;
  return (
    <Layout mode="negocio">
      <h1 className="mb-5 text-xl font-semibold">Mi Plan</h1>
      <div className="rounded-lg border border-line bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div><div className="text-sm text-slate-500">Plan</div><div className="text-lg font-semibold">{data?.suscripcion?.plan_nombre ?? "Sin plan"}</div></div>
          <div><div className="text-sm text-slate-500">Vencimiento</div><div className="text-lg font-semibold">{data?.suscripcion?.fecha_vencimiento ?? "-"}</div></div>
          <div><div className="text-sm text-slate-500">Límite</div><div className="text-lg font-semibold">{limit ?? "Ilimitado"}</div></div>
        </div>
        <div className="mt-5 text-sm">{data?.turnos_usados_mes ?? 0} turnos usados</div>
        <div className="mt-2 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-brand" style={{ width: `${percent}%` }} /></div>
        <p className="mt-4 text-sm text-slate-600">Para cambiar de plan o renovar, contactá al administrador.</p>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
        <table className="table w-full"><thead><tr><th>Fecha</th><th>Monto</th><th>Método</th></tr></thead><tbody>{(data?.pagos ?? []).map((pago) => <tr key={pago.id}><td>{pago.fecha_pago}</td><td>${pago.monto}</td><td>{pago.metodo}</td></tr>)}</tbody></table>
      </div>
    </Layout>
  );
}
