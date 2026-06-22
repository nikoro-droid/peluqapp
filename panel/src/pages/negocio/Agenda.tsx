import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MoreVertical, Plus, Scissors, UserRound } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { Turno } from "../../types";

const today = new Date().toISOString().slice(0, 10);
const hours = Array.from({ length: 12 }, (_, index) => `${String(index + 9).padStart(2, "0")}:00`);
const dayNames = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

const appointmentStyles = [
  "bg-black text-white border-l-[#735c00]",
  "bg-[#e2e2e2] text-black border-l-black",
  "bg-[#fed65b] text-[#574500] border-l-[#735c00]",
  "bg-white text-black border border-[#c4c7c7] border-l-black"
];

function addDays(fecha: string, days: number): string {
  const date = new Date(`${fecha}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(fecha: string): string {
  const date = new Date(`${fecha}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function dayNumber(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit" }).format(new Date(`${fecha}T00:00:00`));
}

function longDate(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${fecha}T00:00:00`));
}

function monthLabel(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(`${fecha}T00:00:00`));
}

function weekLabel(days: string[]): string {
  const start = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(new Date(`${days[0]}T00:00:00`));
  const end = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${days[6]}T00:00:00`));
  return `Semana del ${start} al ${end}`;
}

function money(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value.toLocaleString("es-AR")}`;
}

function minutesFromStart(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return Math.max(0, (h * 60 + (m || 0)) - 9 * 60);
}

export default function Agenda() {
  const api = useApi();
  const [fecha, setFecha] = useState(today);
  const [turnosByDate, setTurnosByDate] = useState<Record<string, Turno[]>>({});

  const weekStart = useMemo(() => startOfWeek(fecha), [fecha]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  useEffect(() => {
    let alive = true;
    void Promise.all(
      weekDays.map(async (day) => {
        const turnos = await api<Turno[]>(`/api/negocio/turnos?fecha=${day}`);
        return [day, turnos] as const;
      })
    ).then((entries) => {
      if (!alive) return;
      setTurnosByDate(Object.fromEntries(entries));
    }).catch(console.error);
    return () => {
      alive = false;
    };
  }, [api, weekDays]);

  const weekTurnos = useMemo(() => weekDays.flatMap((day) => (turnosByDate[day] ?? []).map((turno) => ({ ...turno, fecha: day }))).filter((turno) => turno.estado !== "cancelado"), [turnosByDate, weekDays]);
  const selectedTurnos = useMemo(() => (turnosByDate[fecha] ?? []).filter((turno) => turno.estado !== "cancelado").sort((a, b) => a.hora.localeCompare(b.hora)), [fecha, turnosByDate]);
  const ingresosDia = useMemo(() => selectedTurnos.reduce((total, turno) => total + (turno.servicio_precio ?? 0), 0), [selectedTurnos]);
  const mobileSlots = useMemo(() => Array.from(new Set([...hours.slice(0, 6), ...selectedTurnos.map((turno) => turno.hora.slice(0, 5))])).sort(), [selectedTurnos]);
  const nowLabel = new Date().toTimeString().slice(0, 5);

  return (
    <Layout mode="negocio">
      <div className="-mx-4 -mt-6 min-h-screen bg-[#f9f9f9] pb-24 md:hidden">
        <section className="sticky top-0 z-30 border-b border-[#e2e2e2] bg-white px-4 pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold capitalize text-black">{monthLabel(fecha)}</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#444748]">{longDate(fecha)}</p>
            </div>
            <div className="flex rounded-lg bg-[#eeeeee] p-1">
              <button className="rounded-md bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-black shadow-sm" type="button">Dia</button>
              <button className="rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#444748]" type="button">Mes</button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {weekDays.map((day, index) => {
              const active = day === fecha;
              return (
                <button key={day} className={`flex h-20 min-w-[54px] flex-col items-center justify-center rounded-xl border transition ${active ? "border-black bg-black text-white shadow-lg ring-2 ring-black ring-offset-2" : "border-transparent bg-[#eeeeee] text-[#444748]"}`} onClick={() => setFecha(day)}>
                  <span className="text-[11px] font-semibold">{dayNames[index]}</span>
                  <span className="text-xl font-semibold">{dayNumber(day)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative px-4 pb-16 pt-6 before:absolute before:bottom-0 before:left-[70px] before:top-6 before:w-px before:bg-[#e2e2e2]">
          {fecha === today ? (
            <div className="relative z-10 mb-6 flex gap-4">
              <div className="w-10 pt-1 text-xs font-bold text-black">{nowLabel}</div>
              <div className="flex flex-1 items-center">
                <div className="relative h-0.5 w-full bg-black">
                  <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-black" />
                </div>
              </div>
            </div>
          ) : null}

          {mobileSlots.map((slot) => {
            const turns = selectedTurnos.filter((turno) => turno.hora.slice(0, 5) === slot);
            return (
              <div key={slot} className="relative z-10 mb-6 flex gap-4">
                <div className="w-10 pt-1 text-xs font-semibold text-[#444748]">{slot}</div>
                <div className="min-w-0 flex-1">
                  {turns.length ? (
                    <div className="space-y-3">
                      {turns.map((turno) => (
                        <article key={turno.id} className="rounded-xl border border-[#e2e2e2] bg-white p-4 shadow-sm transition active:scale-[0.99]">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <h2 className="text-base font-bold text-black">{turno.servicio_nombre ?? "Servicio"}</h2>
                            <MoreVertical size={18} className="shrink-0 text-[#444748]" />
                          </div>
                          <div className="mb-1 flex items-center gap-2 text-sm text-[#444748]">
                            <UserRound size={15} />
                            <span>{turno.nombre_cliente}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#444748]">
                            <Clock size={15} />
                            <span>{turno.duracion_min} min</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#e2e2e2] py-4 text-xs font-semibold text-[#444748] transition active:scale-[0.99]" type="button">
                      <Plus size={16} /> Libre - Reservar aqui
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!selectedTurnos.length ? <div className="relative z-10 rounded-xl border border-dashed border-[#c4c7c7] bg-white p-6 text-center text-sm text-[#444748]">No hay turnos confirmados para este dia.</div> : null}
        </section>

        <button className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-black text-white shadow-lg active:scale-95" type="button" title="Nuevo turno">
          <Plus size={26} />
        </button>
      </div>

      <div className="-mx-10 -mt-8 hidden h-[calc(100vh-4rem)] overflow-hidden bg-[#f9f9f9] text-[#1a1c1c] md:flex">
        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 border-b border-[#e2e2e2] bg-[#f9f9f9] px-10 py-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-black">Agenda</h1>
              <p className="mt-1 text-sm text-[#444748]">{weekLabel(weekDays)}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#eeeeee] p-1">
              <button className="rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#444748] hover:bg-[#e8e8e8]" type="button">Dia</button>
              <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black shadow-sm" type="button">Semana</button>
              <button className="rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#444748] hover:bg-[#e8e8e8]" type="button">Mes</button>
            </div>
            <div className="flex items-center overflow-hidden rounded-lg border border-[#c4c7c7] bg-white">
              <button className="p-2 hover:bg-[#eeeeee]" onClick={() => setFecha(addDays(fecha, -7))} title="Semana anterior"><ChevronLeft size={20} /></button>
              <div className="h-6 w-px bg-[#c4c7c7]" />
              <button className="px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#eeeeee]" onClick={() => setFecha(today)}>Hoy</button>
              <div className="h-6 w-px bg-[#c4c7c7]" />
              <button className="p-2 hover:bg-[#eeeeee]" onClick={() => setFecha(addDays(fecha, 7))} title="Semana siguiente"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto p-4">
            <div className="min-w-[1000px] overflow-hidden rounded-xl border border-[#c4c7c7] bg-white shadow-sm">
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-[#c4c7c7] bg-[#f3f3f3]">
                <div className="h-12 border-r border-[#c4c7c7]" />
                {weekDays.map((day, index) => {
                  const active = day === fecha || day === today;
                  return (
                    <button key={day} className={`flex h-12 flex-col items-center justify-center border-r border-[#c4c7c7] last:border-r-0 ${active ? "bg-[#e8e8e8]" : ""}`} onClick={() => setFecha(day)}>
                      <span className={`text-[11px] font-semibold ${active ? "text-black" : "text-[#444748]"}`}>{dayNames[index]}</span>
                      <span className="text-base font-bold text-black">{dayNumber(day)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative grid" style={{ gridTemplateColumns: "80px repeat(7, minmax(0, 1fr))", gridTemplateRows: `repeat(${hours.length}, 80px)` }}>
                {hours.map((hour) => (
                  <div key={hour} className="border-b border-[#e2e2e2] pt-2 text-center text-[11px] font-medium text-[#747878]">{hour}</div>
                ))}
                {hours.flatMap((hour, rowIndex) => weekDays.map((day, dayIndex) => (
                  <div key={`${hour}-${day}`} className={`border-b border-r border-[#e2e2e2] ${day === fecha || day === today ? "bg-[#eeeeee]" : ""}`} style={{ gridColumn: dayIndex + 2, gridRow: rowIndex + 1 }} />
                )))}

                <div className="pointer-events-none absolute inset-y-0 left-[80px] right-0">
                  {weekTurnos.map((turno, index) => {
                    const dayIndex = weekDays.indexOf(turno.fecha);
                    if (dayIndex < 0) return null;
                    const top = Math.min(minutesFromStart(turno.hora) * (80 / 60), hours.length * 80 - 56);
                    const height = Math.max(56, turno.duracion_min * (80 / 60));
                    const style = appointmentStyles[index % appointmentStyles.length];
                    return (
                      <article
                        key={`${turno.fecha}-${turno.id}`}
                        className={`pointer-events-auto absolute cursor-pointer rounded-lg border-l-4 p-3 shadow-sm transition hover:z-10 hover:scale-[1.02] ${style}`}
                        style={{ top, left: `${dayIndex * (100 / 7)}%`, width: `${100 / 7}%`, height }}
                      >
                        <p className="text-[11px] font-semibold opacity-80">{turno.hora} - {turno.duracion_min} min</p>
                        <h2 className="truncate text-sm font-bold">{turno.nombre_cliente}</h2>
                        <p className="truncate text-xs opacity-80">{turno.servicio_nombre ?? "Servicio"}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden w-80 flex-col border-l border-[#e2e2e2] bg-[#f9f9f9] lg:flex">
          <div className="border-b border-[#e2e2e2] p-10">
            <h2 className="text-xl font-semibold text-black">Resumen Hoy</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#444748]">{longDate(fecha)}</p>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#c4c7c7] bg-[#f3f3f3] p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#444748]">Turnos</span>
                <span className="mt-1 block text-2xl font-semibold text-black">{selectedTurnos.length}</span>
              </div>
              <div className="rounded-xl border border-[#c4c7c7] bg-[#f3f3f3] p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#444748]">Ingresos</span>
                <span className="mt-1 block text-2xl font-semibold text-black">{money(ingresosDia)}</span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-black">Proximos Turnos</h3>
              <div className="space-y-2">
                {selectedTurnos.map((turno) => (
                  <article key={turno.id} className="group flex cursor-pointer items-start gap-3 rounded-xl border border-[#c4c7c7] bg-white p-4 transition hover:border-black">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#eeeeee] text-black transition group-hover:scale-105">
                      <Scissors size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-black">{turno.nombre_cliente}</p>
                      <p className="truncate text-sm text-[#444748]">{turno.hora} - {turno.duracion_min} min</p>
                    </div>
                    <MoreVertical size={18} className="text-[#747878]" />
                  </article>
                ))}
                {!selectedTurnos.length ? <div className="rounded-xl border border-dashed border-[#c4c7c7] bg-white p-6 text-center text-sm text-[#444748]">Agenda libre para esta fecha</div> : null}
              </div>
            </div>
          </div>
          <div className="border-t border-[#e2e2e2] bg-[#f3f3f3] p-10">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90" type="button">
              <Plus size={18} /> Nuevo Turno
            </button>
          </div>
        </aside>

        <button className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-black text-white shadow-2xl lg:hidden" type="button" title="Nuevo turno">
          <Plus size={24} />
        </button>
      </div>
    </Layout>
  );
}
