import { FormEvent, useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { Negocio } from "../../types";

export default function Configuracion() {
  const api = useApi();
  const [config, setConfig] = useState<Negocio | null>(null);
  useEffect(() => {
    api<Negocio>("/api/negocio/config").then(setConfig).catch(console.error);
  }, [api]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const next = await api<Negocio>("/api/negocio/config", { method: "PATCH", body: JSON.stringify({ ...data, duracion_turno_min: Number(data.duracion_turno_min) }) });
    setConfig(next);
  }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("/api/negocio/config/password", { method: "POST", body: JSON.stringify({ password: data.password }) });
    event.currentTarget.reset();
  }
  return (
    <Layout mode="negocio">
      <h1 className="mb-5 text-xl font-semibold">Configuracion</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={save} className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Datos del negocio</h2>
          <input className="input mb-3" name="nombre" defaultValue={config?.nombre} placeholder="Nombre" />
          <input className="input mb-3" name="horario_apertura" type="time" defaultValue={config?.horario_apertura} />
          <input className="input mb-3" name="horario_cierre" type="time" defaultValue={config?.horario_cierre} />
          <input className="input mb-3" name="duracion_turno_min" type="number" min={5} step={5} defaultValue={config?.duracion_turno_min} />
          <button className="btn btn-primary">Guardar</button>
        </form>
        <form onSubmit={password} className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Contrasena</h2>
          <input className="input mb-3" name="password" type="password" minLength={8} placeholder="Nueva contrasena" />
          <button className="btn btn-primary">Cambiar</button>
        </form>
      </div>
    </Layout>
  );
}