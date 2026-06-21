import { FormEvent, useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { Plan } from "../../types";

export default function Suscripciones() {
  const api = useApi();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const load = () => {
    void api<Plan[]>("/api/superadmin/planes").then(setPlanes).catch(console.error);
  };
  useEffect(load, [api]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("/api/superadmin/planes", { method: "POST", body: JSON.stringify({ nombre: data.nombre, precio_mensual: Number(data.precio_mensual), limite_turnos_mes: data.limite_turnos_mes ? Number(data.limite_turnos_mes) : null, descripcion: data.descripcion }) });
    event.currentTarget.reset();
    load();
  }
  return (
    <Layout mode="admin">
      <h1 className="mb-5 text-xl font-semibold">Planes y pagos</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <table className="table w-full"><thead><tr><th>Plan</th><th>Precio</th><th>Límite</th><th>Descripción</th></tr></thead><tbody>{planes.map((plan) => <tr key={plan.id}><td>{plan.nombre}</td><td>${plan.precio_mensual}</td><td>{plan.limite_turnos_mes ?? "Ilimitado"}</td><td>{plan.descripcion}</td></tr>)}</tbody></table>
        </div>
        <form onSubmit={create} className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Nuevo plan</h2>
          <input className="input mb-3" name="nombre" placeholder="Nombre" required />
          <input className="input mb-3" name="precio_mensual" type="number" placeholder="Precio mensual" required />
          <input className="input mb-3" name="limite_turnos_mes" type="number" placeholder="Límite de turnos" />
          <textarea className="input mb-3" name="descripcion" placeholder="Descripción" />
          <button className="btn btn-primary w-full">Crear plan</button>
        </form>
      </div>
    </Layout>
  );
}
