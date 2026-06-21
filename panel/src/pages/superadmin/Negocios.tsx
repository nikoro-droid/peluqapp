import { FormEvent, useEffect, useState } from "react";
import { Eye, Plus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import PlanBadge from "../../components/PlanBadge";
import { useApi } from "../../hooks/useApi";
import type { Negocio, Plan } from "../../types";

export default function Negocios() {
  const api = useApi();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const load = () => {
    api<Negocio[]>("/api/superadmin/negocios").then(setNegocios).catch(console.error);
    api<Plan[]>("/api/superadmin/planes").then(setPlanes).catch(console.error);
  };
  useEffect(load, [api]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api<Negocio>("/api/superadmin/negocios", {
      method: "POST",
      body: JSON.stringify({ ...data, plan_id: Number(data.plan_id), meses: Number(data.meses) || 1 })
    });
    setOpen(false);
    load();
  }

  async function toggle(negocio: Negocio) {
    await api(`/api/superadmin/negocios/${negocio.id}/${negocio.activo ? "suspender" : "reactivar"}`, {
      method: "POST",
      body: JSON.stringify({ motivo: "Panel" })
    });
    load();
  }

  return (
    <Layout mode="admin">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Peluquerias</h1>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Nueva peluqueria
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="table w-full">
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Plan</th><th>Estado</th><th>Dias</th><th>Turnos</th><th></th></tr>
          </thead>
          <tbody>
            {negocios.map((negocio) => (
              <tr key={negocio.id}>
                <td>{negocio.nombre}</td>
                <td>{negocio.email}</td>
                <td><PlanBadge estado={negocio.suscripcion?.estado} plan={negocio.suscripcion?.plan_nombre} /></td>
                <td>{negocio.activo ? "Activo" : "Suspendido"}</td>
                <td>{negocio.dias_restantes ?? 0}</td>
                <td>{negocio.turnos_mes ?? 0}</td>
                <td className="flex justify-end gap-2">
                  <Link className="btn btn-muted" to={`/admin/negocios/${negocio.id}`} title="Ver detalle"><Eye size={16} /></Link>
                  <button className="btn btn-muted" onClick={() => toggle(negocio)} title="Suspender o reactivar"><RefreshCw size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <div className="fixed inset-0 grid place-items-center bg-black/30 p-4">
          <form onSubmit={submit} className="grid w-full max-w-2xl gap-3 rounded-lg bg-white p-5">
            <h2 className="font-semibold">Nueva peluqueria</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input" name="nombre" placeholder="Nombre" required />
              <input className="input" name="email" type="email" placeholder="Email" required />
              <input className="input" name="password" placeholder="Contrasena temporal" required />
              <input className="input" name="telefono_dueno" placeholder="Telefono dueno" required />
              <input className="input md:col-span-2" name="evolution_instance" placeholder="Evolution Instance" required />
              <select className="input" name="plan_id">{planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}</select>
              <input className="input" name="meses" type="number" defaultValue={1} min={1} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-muted" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary">Crear</button>
            </div>
          </form>
        </div>
      ) : null}
    </Layout>
  );
}
