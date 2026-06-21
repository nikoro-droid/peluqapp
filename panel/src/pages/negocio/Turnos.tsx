import { FormEvent, useEffect, useMemo, useState } from "react";
import { Ban, CalendarDays, ChevronLeft, ChevronRight, Clock, Phone, Scissors } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { Turno } from "../../types";

const today = new Date().toISOString().slice(0, 10);

function addDays(fecha: string, days: number): string {
  const date = new Date(`${fecha}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number | null): string {
  return value === null ? "-" : `$${value}`;
}

function statusClasses(estado: string): string {
  return estado === "confirmado" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500";
}

export default function Turnos() {
  const api = useApi();
  const [fecha, setFecha] = useState(today);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [open, setOpen] = useState(false);

  const load = () => {
    void api<Turno[]>(`/api/negocio/turnos?fecha=${fecha}`).then(setTurnos).catch(console.error);
  };

  useEffect(load, [api, fecha]);

  const resumen = useMemo(() => {
    const confirmados = turnos.filter((turno) => turno.estado === "confirmado");
    const minutos = confirmados.reduce((total, turno) => total + turno.duracion_min, 0);
    const ingresos = confirmados.reduce((total, turno) => total + (turno.servicio_precio ?? 0), 0);
    return { confirmados: confirmados.length, minutos, ingresos };
  }, [turnos]);

  async function cancel(id: number) {
    await api(`/api/negocio/turnos/${id}`, { method: "DELETE" });
    load();
  }

  async function block(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("/api/negocio/bloqueos", { method: "POST", body: JSON.stringify(data) });
    setOpen(false);
  }

  return (
    <Layout mode="negocio">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Agenda</h1>
          <p className="mt-1 text-sm text-slate-500">{fecha}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Ban size={16} /> Bloquear horario</button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-2">
          <button className="btn btn-muted" title="Dia anterior" onClick={() => setFecha(addDays(fecha, -1))}><ChevronLeft size={16} /></button>
          <input className="input w-44" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          <button className="btn btn-muted" title="Dia siguiente" onClick={() => setFecha(addDays(fecha, 1))}><ChevronRight size={16} /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-white p-3"><div className="text-xs uppercase text-slate-500">Turnos</div><div className="mt-1 text-2xl font-semibold">{resumen.confirmados}</div></div>
          <div className="rounded-lg border border-line bg-white p-3"><div className="text-xs uppercase text-slate-500">Horas ocupadas</div><div className="mt-1 text-2xl font-semibold">{Math.round((resumen.minutos / 60) * 10) / 10}</div></div>
          <div className="rounded-lg border border-line bg-white p-3"><div className="text-xs uppercase text-slate-500">Ingresos</div><div className="mt-1 text-2xl font-semibold">${resumen.ingresos}</div></div>
        </div>
      </div>

      {turnos.length ? (
        <div className="grid gap-3">
          {turnos.map((turno) => (
            <article key={turno.id} className={`rounded-lg border border-line bg-white p-4 ${turno.estado === "cancelado" ? "opacity-60" : ""}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className="grid h-12 w-16 shrink-0 place-items-center rounded-md bg-teal-50 text-brand">
                    <div className="text-sm font-semibold">{turno.hora}</div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{turno.nombre_cliente}</h2>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(turno.estado)}`}>{turno.estado}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
                      <span className="inline-flex items-center gap-2"><Phone size={14} /> {turno.telefono_cliente}</span>
                      <span className="inline-flex items-center gap-2"><Scissors size={14} /> {turno.servicio_nombre ?? "Servicio"}</span>
                      <span className="inline-flex items-center gap-2"><Clock size={14} /> {turno.duracion_min} min - {formatMoney(turno.servicio_precio)}</span>
                    </div>
                  </div>
                </div>
                {turno.estado !== "cancelado" ? <button className="btn btn-muted" onClick={() => cancel(turno.id)}>Cancelar</button> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <div>
            <CalendarDays className="mx-auto mb-3 text-slate-400" size={34} />
            <h2 className="font-semibold">No hay turnos para esta fecha</h2>
            <p className="mt-1 text-sm text-slate-500">Cuando el agente confirme reservas, van a aparecer aca.</p>
          </div>
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/30 p-4">
          <form onSubmit={block} className="w-full max-w-md rounded-lg bg-white p-5">
            <h2 className="mb-3 font-semibold">Bloquear horario</h2>
            <input className="input mb-3" name="fecha_inicio" placeholder="YYYY-MM-DD HH:MM" required />
            <input className="input mb-3" name="fecha_fin" placeholder="YYYY-MM-DD HH:MM" required />
            <input className="input mb-3" name="motivo" placeholder="Motivo" />
            <div className="flex justify-end gap-2"><button type="button" className="btn btn-muted" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary">Guardar</button></div>
          </form>
        </div>
      ) : null}
    </Layout>
  );
}