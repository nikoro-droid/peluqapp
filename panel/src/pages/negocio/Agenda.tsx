import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Lock, LockOpen, Plus, Scissors, Trash2, UserRound, X } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { Bloqueo, Servicio, Turno } from "../../types";

const today = new Date().toISOString().slice(0, 10);
const hours = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
const dayNames = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];

const appointmentStyles = [
  "bg-black text-white border-l-[#735c00]",
  "bg-[#e2e2e2] text-black border-l-black",
  "bg-[#fed65b] text-[#574500] border-l-[#735c00]",
  "bg-white text-black border border-[#c4c7c7] border-l-black"
];

function addDays(fecha: string, days: number): string {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function dayNumber(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit" }).format(new Date(`${fecha}T00:00:00`));
}

function longDate(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${fecha}T00:00:00`));
}

function weekLabel(days: string[]): string {
  const start = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(new Date(`${days[0]}T00:00:00`));
  const end = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${days[6]}T00:00:00`));
  return `Semana del ${start} al ${end}`;
}

function monthLabel(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(`${fecha}T00:00:00`));
}

function money(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value.toLocaleString("es-AR")}`;
}

function minutesFromStart(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return Math.max(0, (h * 60 + (m || 0)) - 8 * 60);
}

export default function Agenda() {
  const api = useApi();
  const [fecha, setFecha] = useState(today);
  const [vista, setVista] = useState<"dia" | "semana">("semana");
  const [turnosByDate, setTurnosByDate] = useState<Record<string, Turno[]>>({});
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [modal, setModal] = useState<{ fecha: string; hora: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Turno | null>(null);
  const [bloqueoModal, setBloqueoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = useMemo(() => startOfWeek(fecha), [fecha]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const vistaDays = vista === "dia" ? [fecha] : weekDays;

  const loadTurnos = useCallback(() => Promise.all(
    weekDays.map(async (day) => {
      const turnos = await api<Turno[]>(`/api/negocio/turnos?fecha=${day}`);
      return [day, turnos] as const;
    })
  ), [api, weekDays]);

  const loadBloqueos = useCallback(() =>
    api<Bloqueo[]>("/api/negocio/bloqueos").then(setBloqueos).catch(console.error)
  , [api]);

  useEffect(() => {
    void api<Servicio[]>("/api/negocio/servicios")
      .then((items) => setServicios(items.filter((s) => s.activo === 1)))
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    let alive = true;
    void loadTurnos().then((entries) => {
      if (!alive) return;
      setTurnosByDate(Object.fromEntries(entries));
    }).catch(console.error);
    void loadBloqueos();
    return () => { alive = false; };
  }, [loadTurnos, loadBloqueos]);

  async function reload() {
    setTurnosByDate(Object.fromEntries(await loadTurnos()));
    void loadBloqueos();
  }

  function openModal(day = fecha, hour = "09:00") {
    setError(null);
    setModal({ fecha: day, hora: hour });
  }

  async function createTurno(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setError(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api<Turno>("/api/negocio/turnos", {
        method: "POST",
        body: JSON.stringify({
          nombre_cliente: data.nombre_cliente,
          telefono_cliente: data.telefono_cliente,
          fecha: data.fecha,
          hora: data.hora,
          servicio_id: Number(data.servicio_id)
        })
      });
      setModal(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el turno");
    }
  }

  async function confirmCancelTurno() {
    if (!confirmCancel) return;
    await api(`/api/negocio/turnos/${confirmCancel.id}`, { method: "DELETE" });
    setConfirmCancel(null);
    await reload();
  }

  async function createBloqueo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("/api/negocio/bloqueos", {
      method: "POST",
      body: JSON.stringify({
        fecha_inicio: `${data.fecha_inicio} ${data.hora_inicio}`,
        fecha_fin: `${data.fecha_fin} ${data.hora_fin}`,
        motivo: data.motivo || null
      })
    });
    setBloqueoModal(false);
    await loadBloqueos();
  }

  async function deleteBloqueo(id: number) {
    await api(`/api/negocio/bloqueos/${id}`, { method: "DELETE" });
    await loadBloqueos();
  }

  const weekTurnos = useMemo(() =>
    weekDays.flatMap((day) => (turnosByDate[day] ?? []).map((t) => ({ ...t, fecha: day }))).filter((t) => t.estado !== "cancelado"),
    [turnosByDate, weekDays]
  );
  const selectedTurnos = useMemo(() =>
    (turnosByDate[fecha] ?? []).filter((t) => t.estado !== "cancelado").sort((a, b) => a.hora.localeCompare(b.hora)),
    [fecha, turnosByDate]
  );
  const ingresosDia = useMemo(() => selectedTurnos.reduce((t, tur) => t + (tur.servicio_precio ?? 0), 0), [selectedTurnos]);
  const mobileSlots = useMemo(() =>
    Array.from(new Set([...hours.slice(0, 6), ...selectedTurnos.map((t) => t.hora.slice(0, 5))])).sort(),
    [selectedTurnos]
  );
  const nowLabel = new Date().toTimeString().slice(0, 5);

  // Turnos para la vista actual (dia o semana)
  const vistaTurnos = useMemo(() =>
    vistaDays.flatMap((day) => (turnosByDate[day] ?? []).map((t) => ({ ...t, fecha: day }))).filter((t) => t.estado !== "cancelado"),
    [turnosByDate, vistaDays]
  );

  return (
    <Layout mode="negocio">
      {/* ── MOBILE ── */}
      <div className="-mx-4 -mt-6 min-h-screen bg-[#f9f9f9] pb-24 md:hidden">
        <section className="sticky top-0 z-30 border-b border-[#e2e2e2] bg-white px-4 pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold capitalize text-black">{monthLabel(fecha)}</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#444748]">{longDate(fecha)}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {weekDays.map((day, i) => {
              const active = day === fecha;
              return (
                <button key={day} className={`flex h-20 min-w-[54px] flex-col items-center justify-center rounded-xl border transition ${active ? "border-black bg-black text-white shadow-lg ring-2 ring-black ring-offset-2" : "border-transparent bg-[#eeeeee] text-[#444748]"}`} onClick={() => setFecha(day)}>
                  <span className="text-[11px] font-semibold">{dayNames[i]}</span>
                  <span className="text-xl font-semibold">{dayNumber(day)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative px-4 pb-16 pt-6 before:absolute before:bottom-0 before:left-[70px] before:top-6 before:w-px before:bg-[#e2e2e2]">
          {fecha === today && (
            <div className="relative z-10 mb-6 flex gap-4">
              <div className="w-10 pt-1 text-xs font-bold text-black">{nowLabel}</div>
              <div className="flex flex-1 items-center">
                <div className="relative h-0.5 w-full bg-black">
                  <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-black" />
                </div>
              </div>
            </div>
          )}
          {mobileSlots.map((slot) => {
            const turns = selectedTurnos.filter((t) => t.hora.slice(0, 5) === slot);
            return (
              <div key={slot} className="relative z-10 mb-6 flex gap-4">
                <div className="w-10 pt-1 text-xs font-semibold text-[#444748]">{slot}</div>
                <div className="min-w-0 flex-1">
                  {turns.length ? (
                    <div className="space-y-3">
                      {turns.map((turno) => (
                        <article key={turno.id} className="rounded-xl border border-[#e2e2e2] bg-white p-4 shadow-sm">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <h2 className="text-base font-bold text-black">{turno.servicio_nombre ?? "Servicio"}</h2>
                            <button className="rounded p-1 text-[#747878] hover:bg-[#eeeeee] hover:text-[#ba1a1a]" onClick={() => setConfirmCancel(turno)} title="Cancelar turno"><Trash2 size={16} /></button>
                          </div>
                          <div className="mb-1 flex items-center gap-2 text-sm text-[#444748]"><UserRound size={15} /><span>{turno.nombre_cliente}</span></div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#444748]"><Clock size={15} /><span>{turno.duracion_min} min</span></div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#e2e2e2] py-4 text-xs font-semibold text-[#444748] transition active:scale-[0.99]" onClick={() => openModal(fecha, slot)}>
                      <Plus size={16} /> Libre - Reservar aqui
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!selectedTurnos.length && <div className="relative z-10 rounded-xl border border-dashed border-[#c4c7c7] bg-white p-6 text-center text-sm text-[#444748]">No hay turnos confirmados para este dia.</div>}
        </section>

        <button className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-black text-white shadow-lg active:scale-95" onClick={() => openModal()} title="Nuevo turno">
          <Plus size={26} />
        </button>
      </div>

      {/* ── DESKTOP ── */}
      <div className="-mx-10 -mt-8 hidden h-[calc(100vh-4rem)] overflow-hidden bg-[#f9f9f9] text-[#1a1c1c] md:flex">
        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* Header desktop */}
          <div className="flex flex-col gap-4 border-b border-[#e2e2e2] bg-[#f9f9f9] px-10 py-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-black">Agenda</h1>
              <p className="mt-1 text-sm text-[#444748]">{weekLabel(weekDays)}</p>
            </div>
            {/* Toggle vista */}
            <div className="flex items-center gap-2 rounded-xl bg-[#eeeeee] p-1">
              <button
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${vista === "dia" ? "bg-white text-black shadow-sm" : "text-[#444748] hover:bg-[#e8e8e8]"}`}
                onClick={() => setVista("dia")}
              >Dia</button>
              <button
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${vista === "semana" ? "bg-white text-black shadow-sm" : "text-[#444748] hover:bg-[#e8e8e8]"}`}
                onClick={() => setVista("semana")}
              >Semana</button>
            </div>
            {/* Nav semana */}
            <div className="flex items-center overflow-hidden rounded-lg border border-[#c4c7c7] bg-white">
              <button className="p-2 hover:bg-[#eeeeee]" onClick={() => setFecha(addDays(fecha, vista === "dia" ? -1 : -7))} title="Anterior"><ChevronLeft size={20} /></button>
              <div className="h-6 w-px bg-[#c4c7c7]" />
              <button className="px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#eeeeee]" onClick={() => setFecha(today)}>Hoy</button>
              <div className="h-6 w-px bg-[#c4c7c7]" />
              <button className="p-2 hover:bg-[#eeeeee]" onClick={() => setFecha(addDays(fecha, vista === "dia" ? 1 : 7))} title="Siguiente"><ChevronRight size={20} /></button>
            </div>
          </div>

          {/* Grilla */}
          <div className="flex-1 overflow-x-auto p-4">
            <div className={`min-w-0 overflow-hidden rounded-xl border border-[#c4c7c7] bg-white shadow-sm`} style={{ minWidth: vista === "dia" ? "400px" : "900px" }}>
              {/* Header días */}
              <div className={`grid border-b border-[#c4c7c7] bg-[#f3f3f3]`} style={{ gridTemplateColumns: `80px repeat(${vistaDays.length}, 1fr)` }}>
                <div className="h-12 border-r border-[#c4c7c7]" />
                {vistaDays.map((day, i) => {
                  const active = day === fecha || day === today;
                  const di = weekDays.indexOf(day);
                  return (
                    <button key={day} className={`flex h-12 flex-col items-center justify-center border-r border-[#c4c7c7] last:border-r-0 ${active ? "bg-[#e8e8e8]" : ""}`} onClick={() => setFecha(day)}>
                      <span className={`text-[11px] font-semibold ${active ? "text-black" : "text-[#444748]"}`}>{dayNames[di >= 0 ? di : i]}</span>
                      <span className="text-base font-bold text-black">{dayNumber(day)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Filas horarias */}
              <div className="relative grid" style={{ gridTemplateColumns: `80px repeat(${vistaDays.length}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${hours.length}, 80px)` }}>
                {hours.map((hour) => (
                  <div key={hour} className="border-b border-[#e2e2e2] pt-2 text-center text-[11px] font-medium text-[#747878]">{hour}</div>
                ))}
                {hours.flatMap((hour, rowIndex) => vistaDays.map((day, dayIndex) => (
                  <div key={`${hour}-${day}`}
                    className={`cursor-pointer border-b border-r border-[#e2e2e2] transition hover:bg-[#f3f3f3] ${day === fecha || day === today ? "bg-[#eeeeee]" : ""}`}
                    style={{ gridColumn: dayIndex + 2, gridRow: rowIndex + 1 }}
                    onClick={() => openModal(day, hour)}
                  />
                )))}

                {/* Turnos superpuestos */}
                <div className="pointer-events-none absolute inset-y-0 left-[80px] right-0">
                  {vistaTurnos.map((turno, index) => {
                    const dayIndex = vistaDays.indexOf(turno.fecha);
                    if (dayIndex < 0) return null;
                    const top = Math.min(minutesFromStart(turno.hora) * (80 / 60), hours.length * 80 - 56);
                    const height = Math.max(56, turno.duracion_min * (80 / 60));
                    const style = appointmentStyles[index % appointmentStyles.length];
                    return (
                      <article
                        key={`${turno.fecha}-${turno.id}`}
                        className={`pointer-events-auto absolute cursor-pointer rounded-lg border-l-4 p-3 shadow-sm transition hover:z-10 hover:scale-[1.02] ${style}`}
                        style={{ top, left: `${dayIndex * (100 / vistaDays.length)}%`, width: `${100 / vistaDays.length}%`, height }}
                        onClick={() => setConfirmCancel(turno)}
                        title="Click para cancelar"
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

        {/* Sidebar derecho */}
        <aside className="hidden w-80 flex-col border-l border-[#e2e2e2] bg-[#f9f9f9] lg:flex">
          <div className="border-b border-[#e2e2e2] p-6">
            <h2 className="text-xl font-semibold text-black">Resumen</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#444748]">{longDate(fecha)}</p>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Stats */}
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

            {/* Lista turnos del día */}
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-black">Turnos del dia</h3>
              <div className="space-y-2">
                {selectedTurnos.map((turno) => (
                  <article key={turno.id} className="group flex cursor-pointer items-start gap-3 rounded-xl border border-[#c4c7c7] bg-white p-4 transition hover:border-black">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#eeeeee] text-black"><Scissors size={19} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-black">{turno.nombre_cliente}</p>
                      <p className="truncate text-sm text-[#444748]">{turno.hora} - {turno.duracion_min} min</p>
                    </div>
                    <button className="rounded p-1 text-[#747878] hover:bg-[#eeeeee] hover:text-[#ba1a1a]" title="Cancelar" onClick={() => setConfirmCancel(turno)}><Trash2 size={16} /></button>
                  </article>
                ))}
                {!selectedTurnos.length && <div className="rounded-xl border border-dashed border-[#c4c7c7] bg-white p-6 text-center text-sm text-[#444748]">Agenda libre para esta fecha</div>}
              </div>
            </div>

            {/* Bloqueos */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-black">Bloqueos activos</h3>
                <button className="flex items-center gap-1 rounded-lg bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-[#474746]" onClick={() => setBloqueoModal(true)}>
                  <Lock size={12} /> Bloquear
                </button>
              </div>
              <div className="space-y-2">
                {bloqueos.map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-2 rounded-xl border border-[#c4c7c7] bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-black">{b.motivo ?? "Sin motivo"}</p>
                      <p className="text-[10px] text-[#444748]">{b.fecha_inicio.slice(0, 16)} → {b.fecha_fin.slice(0, 16)}</p>
                    </div>
                    <button className="shrink-0 rounded p-1 text-[#747878] hover:bg-[#eeeeee] hover:text-[#ba1a1a]" onClick={() => deleteBloqueo(b.id)}><X size={14} /></button>
                  </div>
                ))}
                {!bloqueos.length && <div className="rounded-xl border border-dashed border-[#c4c7c7] bg-white p-4 text-center text-xs text-[#444748]"><LockOpen size={18} className="mx-auto mb-1 text-[#c4c7c7]" />Sin bloqueos activos</div>}
              </div>
            </div>
          </div>

          {/* Botón nuevo turno */}
          <div className="border-t border-[#e2e2e2] bg-[#f3f3f3] p-6">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90" onClick={() => openModal()}>
              <Plus size={18} /> Nuevo Turno
            </button>
          </div>
        </aside>

        <button className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-black text-white shadow-2xl lg:hidden" onClick={() => openModal()} title="Nuevo turno">
          <Plus size={24} />
        </button>
      </div>

      {/* ── MODAL: Nuevo turno ── */}
      {modal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4">
          <form onSubmit={createTurno} className="grid w-full max-w-md gap-3 rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Nuevo turno</h2>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#eeeeee]" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <input className="input" name="nombre_cliente" placeholder="Nombre del cliente" required />
            <input className="input" name="telefono_cliente" placeholder="Telefono / WhatsApp" required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" name="fecha" type="date" defaultValue={modal.fecha} required />
              <input className="input" name="hora" type="time" defaultValue={modal.hora} required />
            </div>
            <select className="input" name="servicio_id" defaultValue={servicios[0]?.id ?? ""} required>
              <option value="" disabled>Elegir servicio</option>
              {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} - {s.duracion_min} min - ${s.precio}</option>)}
            </select>
            {error && <div className="rounded-lg border border-[#ffdad6] bg-[#fff7f6] p-3 text-sm font-semibold text-[#ba1a1a]">No disponible para ese horario. Revisa el horario comercial y los turnos existentes.</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-[#c4c7c7] px-4 py-2 text-sm font-semibold" onClick={() => setModal(null)}>Cancelar</button>
              <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Guardar turno</button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: Confirmar cancelación ── */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-black">Cancelar turno</h2>
            <p className="mb-1 text-sm text-[#444748]">¿Confirmas la cancelación del turno de:</p>
            <div className="mb-4 rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4">
              <p className="font-semibold text-black">{confirmCancel.nombre_cliente}</p>
              <p className="text-sm text-[#444748]">{confirmCancel.fecha} a las {confirmCancel.hora} — {confirmCancel.servicio_nombre ?? "Servicio"}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border border-[#c4c7c7] px-4 py-2 text-sm font-semibold" onClick={() => setConfirmCancel(null)}>No cancelar</button>
              <button className="rounded-lg bg-[#ba1a1a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onClick={confirmCancelTurno}>Sí, cancelar turno</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Nuevo bloqueo ── */}
      {bloqueoModal && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4">
          <form onSubmit={createBloqueo} className="grid w-full max-w-md gap-3 rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Bloquear horario</h2>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#eeeeee]" onClick={() => setBloqueoModal(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-[#444748]">Desde (fecha)
                <input className="input mt-1" name="fecha_inicio" type="date" defaultValue={fecha} required />
              </label>
              <label className="text-xs font-semibold text-[#444748]">Hora inicio
                <input className="input mt-1" name="hora_inicio" type="time" defaultValue="09:00" required />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-[#444748]">Hasta (fecha)
                <input className="input mt-1" name="fecha_fin" type="date" defaultValue={fecha} required />
              </label>
              <label className="text-xs font-semibold text-[#444748]">Hora fin
                <input className="input mt-1" name="hora_fin" type="time" defaultValue="19:00" required />
              </label>
            </div>
            <input className="input" name="motivo" placeholder="Motivo (opcional)" />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-[#c4c7c7] px-4 py-2 text-sm font-semibold" onClick={() => setBloqueoModal(false)}>Cancelar</button>
              <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Bloquear</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
