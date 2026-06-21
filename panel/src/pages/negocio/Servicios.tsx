import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot, Clock, Save, Scissors } from "lucide-react";
import Layout from "../../components/Layout";
import ServiciosTable from "../../components/ServiciosTable";
import { useApi } from "../../hooks/useApi";
import type { Negocio, Servicio } from "../../types";

export default function Servicios() {
  const api = useApi();
  const [config, setConfig] = useState<Negocio | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [saved, setSaved] = useState(false);

  const activos = useMemo(() => servicios.filter((servicio) => servicio.activo === 1), [servicios]);
  const duracionPromedio = useMemo(() => {
    if (!activos.length) return 0;
    return Math.round(activos.reduce((total, servicio) => total + servicio.duracion_min, 0) / activos.length);
  }, [activos]);

  const loadConfig = () => {
    void api<Negocio>("/api/negocio/config").then(setConfig).catch(console.error);
  };

  useEffect(loadConfig, [api]);

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const next = await api<Negocio>("/api/negocio/config", {
      method: "PATCH",
      body: JSON.stringify({
        nombre: data.nombre,
        horario_apertura: data.horario_apertura,
        horario_cierre: data.horario_cierre,
        duracion_turno_min: Number(data.duracion_turno_min)
      })
    });
    setConfig(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Layout mode="negocio">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bot de respuestas</h1>
          <p className="mt-1 text-sm text-slate-500">Configuracion que usa el bot de WhatsApp para responder turnos, precios, trabajos y horarios</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <Bot size={16} /> {activos.length} trabajos activos
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Clock size={16} /> Horario</div>
          <div className="mt-2 text-2xl font-semibold">{config?.horario_apertura ?? "--:--"} - {config?.horario_cierre ?? "--:--"}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Scissors size={16} /> Trabajos activos</div>
          <div className="mt-2 text-2xl font-semibold">{activos.length}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Clock size={16} /> Duracion promedio</div>
          <div className="mt-2 text-2xl font-semibold">{duracionPromedio || "-"} min</div>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-line bg-white p-4">
        <form onSubmit={saveConfig} className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
          <label className="text-sm font-medium text-slate-700">
            Nombre del negocio
            <input className="input mt-1" name="nombre" defaultValue={config?.nombre} placeholder="Nombre" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Apertura
            <input className="input mt-1" name="horario_apertura" type="time" defaultValue={config?.horario_apertura} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Cierre
            <input className="input mt-1" name="horario_cierre" type="time" defaultValue={config?.horario_cierre} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Bloque base
            <input className="input mt-1" name="duracion_turno_min" type="number" min={5} step={5} defaultValue={config?.duracion_turno_min} />
          </label>
          <button className="btn btn-primary"><Save size={16} /> Guardar</button>
        </form>
        {saved ? <div className="mt-3 text-sm text-emerald-700">Configuracion guardada</div> : null}
      </div>

      <div className="mb-5 rounded-lg border border-line bg-white p-4">
        <h2 className="mb-2 font-semibold">Base de respuestas del bot</h2>
        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <div>Trabajos aceptados: {activos.length ? activos.map((servicio) => servicio.nombre).join(", ") : "ninguno"}</div>
          <div>Horario de atencion: {config?.horario_apertura ?? "--:--"} a {config?.horario_cierre ?? "--:--"}</div>
          <div>Precios: el bot responde usando la tabla de trabajos configurados.</div>
          <div>Duraciones: el bot calcula turnos usando los minutos de cada trabajo.</div>
        </div>
      </div>

      <ServiciosTable endpoint="/api/negocio/servicios" onChange={setServicios} />
    </Layout>
  );
}