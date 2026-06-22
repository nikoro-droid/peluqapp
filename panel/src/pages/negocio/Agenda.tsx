import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { Turno } from "../../types";

const today = new Date().toISOString().slice(0, 10);
const chairs = ["Silla 1", "Silla 2", "Silla 3"];
const colors = [
  { bg: "bg-[#1a6bff]/10", border: "border-[#0053d3]/30", text: "text-[#0053d3]", dot: "bg-[#0053d3]" },
  { bg: "bg-[#00819c]/10", border: "border-[#00667c]/30", text: "text-[#00667c]", dot: "bg-[#00667c]" },
  { bg: "bg-[#6f25fe]/10", border: "border-[#5500d3]/30", text: "text-[#5500d3]", dot: "bg-[#5500d3]" },
  { bg: "bg-[#ffdad6]/60", border: "border-[#ba1a1a]/30", text: "text-[#ba1a1a]", dot: "bg-[#ba1a1a]" }
];

function addDays(fecha: string, days: number): string {
  const date = new Date(`${fecha}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${fecha}T00:00:00`));
}

function hourSlots(turnos: Turno[]): string[] {
  const base = Array.from({ length: 12 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);
  const fromTurns = turnos.map((turno) => `${turno.hora.slice(0, 2)}:00`);
  return Array.from(new Set([...base, ...fromTurns])).sort();
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

function statusLabel(estado: string): string {
  return estado === "cancelado" ? "Cancelado" : "Confirmado";
}

export default function Agenda() {
  const api = useApi();
  const [fecha, setFecha] = useState(today);
  const [turnos, setTurnos] = useState<Turno[]>([]);

  useEffect(() => {
    void api<Turno[]>(`/api/negocio/turnos?fecha=${fecha}`).then(setTurnos).catch(console.error);
  }, [api, fecha]);

  const confirmados = useMemo(() => turnos.filter((turno) => turno.estado !== "cancelado"), [turnos]);
  const slots = useMemo(() => hourSlots(confirmados), [confirmados]);
  const byHour = useMemo(() => {
    const map = new Map<string, Turno[]>();
    confirmados.forEach((turno) => {
      const hour = `${turno.hora.slice(0, 2)}:00`;
      map.set(hour, [...(map.get(hour) ?? []), turno]);
    });
    return map;
  }, [confirmados]);

  return (
    <Layout mode="negocio">
      <div className="-mx-4 -mt-8 min-h-[calc(100vh-4rem)] bg-[#faf8ff] px-4 pb-24 pt-8 md:-mx-10 md:px-10" style={{ backgroundImage: "radial-gradient(at 0% 0%, hsla(220,100%,95%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(260,100%,96%,1) 0, transparent 50%)", backgroundAttachment: "fixed" }}>
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div className="mb-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#131b2e]">Agenda General</h1>
                <p className="text-base capitalize text-[#727687]">{formatDate(fecha)}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/60 p-1 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                <button className="rounded-full p-2 text-[#131b2e] transition hover:bg-[#dae2fd]" onClick={() => setFecha(addDays(fecha, -1))} title="Dia anterior"><ChevronLeft size={20} /></button>
                <button className="px-4 text-xs font-semibold uppercase tracking-wider text-[#131b2e]" onClick={() => setFecha(today)}>Hoy</button>
                <button className="rounded-full p-2 text-[#131b2e] transition hover:bg-[#dae2fd]" onClick={() => setFecha(addDays(fecha, 1))} title="Dia siguiente"><ChevronRight size={20} /></button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <button className="whitespace-nowrap rounded-full bg-[#0053d3] px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">Todos los profesionales</button>
              <button className="whitespace-nowrap rounded-full border border-[#c2c6d8] bg-white px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#424655] transition hover:bg-[#dae2fd]">Cortes</button>
              <button className="whitespace-nowrap rounded-full border border-[#c2c6d8] bg-white px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#424655] transition hover:bg-[#dae2fd]">Color</button>
              <button className="whitespace-nowrap rounded-full border border-[#c2c6d8] bg-white px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#424655] transition hover:bg-[#dae2fd]">Tratamientos</button>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/40 bg-white/60 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl md:p-6">
              <div className="mb-4 grid grid-cols-[60px_1fr_1fr_1fr] gap-4 border-b border-[#c2c6d8]/40 pb-4">
                <div className="text-right text-xs font-semibold uppercase tracking-wider text-[#727687]">Hora</div>
                {chairs.map((chair) => <div key={chair} className="text-center text-xs font-semibold uppercase tracking-wider text-[#131b2e]">{chair}</div>)}
              </div>

              <div className="relative space-y-4">
                {slots.map((slot) => {
                  const turns = byHour.get(slot) ?? [];
                  return (
                    <div key={slot} className="relative grid min-h-[96px] grid-cols-[60px_1fr] items-start gap-4">
                      <div className="border-t border-[#c2c6d8]/30 pt-2 text-right font-mono text-sm font-medium text-[#727687]">{slot}</div>
                      <div className="absolute bottom-0 left-[76px] right-0 top-0 grid grid-cols-3 gap-4">
                        {chairs.map((chair, chairIndex) => {
                          const turno = turns.find((_, index) => index % 3 === chairIndex);
                          if (!turno) return <div key={chair} />;
                          const color = colors[(turno.id + chairIndex) % colors.length];
                          const height = turno.duracion_min >= 60 ? "h-[104px]" : "h-[72px]";
                          return (
                            <article key={turno.id} className={`${color.bg} ${color.border} ${height} cursor-pointer rounded-lg border p-3 transition hover:shadow-md`}>
                              <div className="mb-1 flex items-start justify-between">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${color.text}`}>{turno.hora} - {turno.duracion_min} min</span>
                                <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                              </div>
                              <div className="truncate text-base font-medium text-[#131b2e]">{turno.nombre_cliente}</div>
                              <div className="truncate text-xs font-semibold uppercase tracking-wider text-[#727687]">{turno.servicio_nombre ?? "Servicio"}</div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {!confirmados.length ? (
                  <div className="grid min-h-[360px] place-items-center text-center">
                    <div>
                      <Clock className="mx-auto mb-3 text-[#727687]" size={34} />
                      <h2 className="text-lg font-semibold text-[#131b2e]">No hay turnos para esta fecha</h2>
                      <p className="mt-1 text-sm text-[#727687]">Cuando el agente confirme reservas, van a aparecer aca.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <div className="sticky top-24 rounded-xl border border-white/40 bg-white/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#131b2e]">Turnos de Hoy</h2>
                <span className="rounded-full bg-[#dae2fd] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#424655]">{confirmados.length} Totales</span>
              </div>
              <div className="space-y-4">
                {confirmados.map((turno, index) => {
                  const color = colors[(turno.id + index) % colors.length];
                  return (
                    <article key={turno.id} className={`relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-lg border p-3 transition hover:bg-[#dae2fd]/40 ${index === 0 ? "border-[#c2c6d8]/60 bg-[#dae2fd]/30 shadow-sm" : "border-transparent hover:border-[#c2c6d8]/40"}`}>
                      {index === 0 ? <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#ba1a1a]" /> : null}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color.bg} font-bold ${color.text}`}>{initials(turno.nombre_cliente)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-[#131b2e]">{turno.nombre_cliente}</p>
                        <p className="truncate text-xs font-semibold uppercase tracking-wider text-[#727687]">{turno.hora} • {turno.servicio_nombre ?? "Servicio"}</p>
                      </div>
                      <div className="rounded-full border border-[#c2c6d8]/60 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#424655]">{statusLabel(turno.estado)}</div>
                    </article>
                  );
                })}
                {!confirmados.length ? <div className="rounded-lg border border-dashed border-[#c2c6d8] p-6 text-center text-sm text-[#727687]">Agenda libre para esta fecha</div> : null}
              </div>
              <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a6bff] py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#0053d3]" type="button">
                <Plus size={18} /> Nuevo Turno
              </button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
