import { FormEvent, useEffect, useState } from "react";
import { Eye, Plus, RefreshCw, Store } from "lucide-react";
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black md:text-4xl">Peluquerias</h1>
          <p className="mt-1 text-base text-[#444748]">Alta, estado y configuracion comercial de cada negocio.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#474746]" onClick={() => setOpen(true)}>
          <Plus size={17} /> Nueva peluqueria
        </button>
      </div>

      <section className="overflow-hidden rounded-lg border border-[#c4c7c7] bg-white">
        <div className="border-b border-[#c4c7c7] bg-[#eeeeee] px-6 py-4">
          <div className="flex items-center gap-2 text-xl font-semibold text-black"><Store size={20} /> Directorio</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f9f9f9] text-xs uppercase text-[#444748]"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Dias</th><th className="px-4 py-3">Turnos</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-[#c4c7c7] text-sm">
              {negocios.map((negocio) => (
                <tr key={negocio.id} className="hover:bg-[#f9f9f9]">
                  <td className="px-4 py-4 font-semibold text-black">{negocio.nombre}</td>
                  <td className="px-4 py-4 text-[#444748]">{negocio.email}</td>
                  <td className="px-4 py-4"><PlanBadge estado={negocio.suscripcion?.estado} plan={negocio.suscripcion?.plan_nombre} /></td>
                  <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${negocio.activo ? "bg-emerald-50 text-emerald-700" : "bg-[#eeeeee] text-[#444748]"}`}>{negocio.activo ? "Activo" : "Suspendido"}</span></td>
                  <td className="px-4 py-4">{negocio.dias_restantes ?? 0}</td>
                  <td className="px-4 py-4">{negocio.turnos_mes ?? 0}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link className="grid h-9 w-9 place-items-center rounded-md border border-[#c4c7c7] bg-white hover:bg-[#eeeeee]" to={`/admin/negocios/${negocio.id}`} title="Ver detalle"><Eye size={16} /></Link>
                      <button className="grid h-9 w-9 place-items-center rounded-md border border-[#c4c7c7] bg-white hover:bg-[#eeeeee]" onClick={() => toggle(negocio)} title="Suspender o reactivar"><RefreshCw size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!negocios.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[#444748]">No hay peluquerias cargadas</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <form onSubmit={submit} className="grid w-full max-w-2xl gap-3 rounded-xl border border-[#c4c7c7] bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-black">Nueva peluqueria</h2>
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
              <button type="button" className="rounded-md border border-[#c4c7c7] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#eeeeee]" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#474746]">Crear</button>
            </div>
          </form>
        </div>
      ) : null}
    </Layout>
  );
}
