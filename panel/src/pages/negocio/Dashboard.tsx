import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Clock, DollarSign, MessageCircle, MoreVertical, Send, Star, Trophy, TrendingUp, UserRound, Wifi, WifiOff } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { ClienteMarketing, MensajeLog, Turno } from "../../types";

interface Stats {
  turnos_hoy: number;
  turnos_semana: number;
  turnos_mes: number;
  turnos_usados_mes: number;
  limite_turnos_mes: number | null;
  porcentaje_uso: number;
  dias_restantes_suscripcion: number;
  estado_suscripcion: string;
  nombre_plan: string | null;
}

interface EvolutionStatus {
  state: string | null;
  connected: boolean;
}

const today = new Date().toISOString().slice(0, 10);
const todayLabel = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

function money(value: number): string {
  return `$${value.toLocaleString("es-AR")}`;
}

function initials(value: string | null | undefined): string {
  if (!value) return "CL";
  return value.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "CL";
}

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [mensajes, setMensajes] = useState<MensajeLog[]>([]);
  const [clientesMarketing, setClientesMarketing] = useState<ClienteMarketing[]>([]);
  const [evolutionStatus, setEvolutionStatus] = useState<EvolutionStatus | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function loadMessages() {
    return api<MensajeLog[]>("/api/negocio/mensajes").then((items) => {
      setMensajes(items);
      setSelectedPhone(items.find((m) => m.telefono)?.telefono ?? null);
    });
  }

  useEffect(() => {
    void api<Stats>("/api/negocio/stats").then(setStats).catch(console.error);
    void api<Turno[]>(`/api/negocio/turnos?fecha=${today}`).then(setTurnos).catch(console.error);
    void loadMessages().catch(console.error);
    void api<ClienteMarketing[]>("/api/negocio/marketing/clientes?dias=30").then(setClientesMarketing).catch(console.error);
    // Consultar estado real de Evolution API
    void api<EvolutionStatus>("/api/negocio/evolution/status")
      .then(setEvolutionStatus)
      .catch(() => setEvolutionStatus({ state: null, connected: false }));
  }, [api]);

  const confirmados = useMemo(() => turnos.filter((t) => t.estado === "confirmado"), [turnos]);
  const ingresos = useMemo(() => confirmados.reduce((t, tur) => t + (tur.servicio_precio ?? 0), 0), [confirmados]);
  const proximo = useMemo(() => confirmados.find((t) => t.hora >= new Date().toTimeString().slice(0, 5)) ?? confirmados[0], [confirmados]);

  const conversaciones = useMemo(() => {
    const map = new Map<string, MensajeLog[]>();
    mensajes.forEach((m) => { if (!m.telefono) return; map.set(m.telefono, [...(map.get(m.telefono) ?? []), m]); });
    return Array.from(map.entries()).map(([telefono, items]) => ({ telefono, items, latest: items[0] })).sort((a, b) => b.latest.id - a.latest.id);
  }, [mensajes]);

  const selectedConversation = useMemo(() => {
    const phone = selectedPhone ?? conversaciones[0]?.telefono;
    return conversaciones.find((c) => c.telefono === phone) ?? conversaciones[0];
  }, [conversaciones, selectedPhone]);

  const selectedMessages = useMemo(() => [...(selectedConversation?.items ?? [])].sort((a, b) => a.id - b.id), [selectedConversation]);

  // Top clientes por fidelidad
  const topClientes = useMemo(() => [...clientesMarketing].sort((a, b) => b.total_turnos - a.total_turnos).slice(0, 5), [clientesMarketing]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const telefono = selectedConversation?.telefono;
    if (!telefono || !reply.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      await api("/api/negocio/mensajes", { method: "POST", body: JSON.stringify({ telefono, mensaje: reply.trim() }) });
      setReply("");
      await loadMessages();
    } catch {
      setNotice("No se pudo enviar el mensaje. Revisa la conexion de WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  async function sendCoupon() {
    if (!clientesMarketing.length) { setNotice("No hay clientes inactivos para contactar."); return; }
    setSending(true);
    setNotice(null);
    try {
      await api("/api/negocio/marketing/difusion", {
        method: "POST",
        body: JSON.stringify({
          destinatarios: clientesMarketing.map((c) => ({ telefono: c.telefono, nombre: c.nombre })),
          mensaje: "Hola {nombre}, te esperamos esta semana. Responde este mensaje y coordinamos tu proximo turno."
        })
      });
      setNotice("Campana enviada a clientes inactivos.");
      await loadMessages();
    } catch {
      setNotice("No se pudo enviar la campana. Revisa la conexion de WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  const evolutionConnected = evolutionStatus?.connected ?? false;
  const evolutionLabel = evolutionStatus === null ? "Verificando..." : evolutionConnected ? "conectado" : (evolutionStatus.state ? evolutionStatus.state : "desconectado");

  return (
    <Layout mode="negocio">
      {/* ── MOBILE ── */}
      <div className="md:hidden">
        <section className="grid grid-cols-2 gap-4">
          <article className="col-span-2 flex h-32 flex-col justify-between rounded-xl border border-black bg-black p-6 text-white">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#858383]">Proximo turno</span>
              <Clock size={22} className="text-[#fed65b]" />
            </div>
            <div>
              <p className="truncate text-xl font-semibold">{proximo?.nombre_cliente ?? "Sin turnos"}</p>
              <p className="text-xs font-semibold text-[#858383]">{proximo ? `${proximo.hora} · ${proximo.servicio_nombre ?? "Servicio"}` : "Agenda libre"}</p>
            </div>
          </article>
          <article className="flex h-28 flex-col justify-between rounded-xl border border-[#c4c7c7] bg-white p-4">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#444748]">Citas hoy</span>
              <CalendarDays size={20} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats?.turnos_hoy ?? 0}</span>
              <span className="text-[10px] text-[#444748]">/ {stats?.turnos_semana ?? 0}</span>
            </div>
          </article>
          <article className="flex h-28 flex-col justify-between rounded-xl border border-[#c4c7c7] bg-white p-4">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#444748]">Ingresos</span>
              <DollarSign size={20} className="text-[#735c00]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{money(ingresos)}</span>
              <span className="text-[10px] font-bold text-[#735c00]">+{confirmados.length}</span>
            </div>
          </article>
        </section>

        {/* Chat mobile */}
        <section className="mt-6 flex h-[400px] flex-col overflow-hidden rounded-xl border border-[#c4c7c7] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#c4c7c7] bg-[#f3f3f3] p-4">
            <div className="flex max-w-[260px] items-center gap-3 overflow-x-auto">
              {conversaciones.slice(0, 4).map((c, i) => (
                <button key={c.telefono} className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${i === 0 ? "border-black bg-black text-white" : "border-[#c4c7c7] bg-[#e2e2e2] text-[#444748] opacity-60"}`} onClick={() => setSelectedPhone(c.telefono)}>
                  {initials(c.telefono)}
                </button>
              ))}
              {!conversaciones.length && <div className="text-sm text-[#444748]">Sin conversaciones</div>}
            </div>
            <MoreVertical size={20} className="text-[#444748]" />
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4">
            {selectedMessages.slice(-5).map((m) => (
              <div key={m.id} className={`flex max-w-[85%] flex-col ${m.direccion === "saliente" ? "ml-auto items-end" : "items-start"}`}>
                <div className={`rounded-xl px-4 py-2 text-sm ${m.direccion === "saliente" ? "bg-black text-white" : "bg-[#eeeeee] text-black"}`}>{m.contenido}</div>
                <span className="ml-1 mt-1 text-[10px] uppercase text-[#747878]">{m.created_at.slice(11, 16)}</span>
              </div>
            ))}
            {!selectedMessages.length && <div className="grid h-full place-items-center text-sm text-[#747878]">Todavia no hay mensajes registrados.</div>}
          </div>
          <form onSubmit={sendReply} className="flex items-center gap-3 border-t border-[#c4c7c7] bg-white p-4">
            <div className="flex h-10 flex-1 items-center rounded-full border border-[#c4c7c7] bg-[#f3f3f3] px-4">
              <input className="w-full border-none bg-transparent p-0 text-sm outline-none focus:ring-0" placeholder="Responder..." value={reply} onChange={(e) => setReply(e.target.value)} disabled={!selectedConversation || sending} />
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-black text-white disabled:opacity-50" disabled={!selectedConversation || !reply.trim() || sending}><Send size={18} /></button>
          </form>
          {notice && <div className="border-t border-[#c4c7c7] px-4 py-2 text-xs font-semibold text-[#444748]">{notice}</div>}
        </section>

        {/* Crecimiento mobile */}
        <section className="space-y-4 pb-8 pt-6">
          <h2 className="px-1 text-xl font-bold text-black">Crecimiento</h2>
          <article className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
            <button className="flex w-full items-center justify-between p-6 text-left active:bg-[#f3f3f3]" onClick={() => setMarketingOpen((o) => !o)}>
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#fed65b]/30 text-[#735c00]"><Send size={20} /></div>
                <div><h3 className="font-bold">Retencion de clientes</h3><p className="text-xs font-semibold text-[#444748]">{clientesMarketing.length} clientes inactivos</p></div>
              </div>
              <ChevronDown className={`transition ${marketingOpen ? "rotate-180" : ""}`} size={20} />
            </button>
            {marketingOpen && <div className="space-y-4 border-t border-[#c4c7c7] px-6 pb-6 pt-4"><p className="text-sm text-[#444748]">Clientes sin contacto reciente listos para recibir cupones y recordatorios.</p><button className="w-full rounded-lg bg-black py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60" type="button" disabled={sending} onClick={sendCoupon}>Enviar recordatorio</button></div>}
          </article>
          <article className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
            <button className="flex w-full items-center justify-between p-6 text-left active:bg-[#f3f3f3]" onClick={() => setLoyaltyOpen((o) => !o)}>
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e8e8e8]"><Star size={20} /></div>
                <div><h3 className="font-bold">Clientes fieles</h3><p className="text-xs font-semibold text-[#444748]">{topClientes.length} mejores clientes</p></div>
              </div>
              <ChevronDown className={`transition ${loyaltyOpen ? "rotate-180" : ""}`} size={20} />
            </button>
            {loyaltyOpen && (
              <div className="border-t border-[#c4c7c7] px-6 pb-6 pt-4">
                <div className="space-y-2">
                  {topClientes.map((c, i) => (
                    <div key={c.telefono} className="flex items-center gap-3 rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-3">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-black text-xs font-bold text-white">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-black">{c.nombre}</p>
                        <p className="text-xs text-[#444748]">{c.total_turnos} turnos · {money(c.total_gastado)}</p>
                      </div>
                    </div>
                  ))}
                  {!topClientes.length && <p className="text-sm text-[#444748]">Sin datos de clientes todavia.</p>}
                </div>
              </div>
            )}
          </article>
        </section>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-black md:text-4xl">Resumen del dia</h1>
            <p className="mt-1 text-base text-[#444748]">{todayLabel}</p>
          </div>
          {/* Estado REAL de Evolution */}
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${evolutionConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#c4c7c7] bg-white text-[#444748]"}`}>
            {evolutionConnected ? <Wifi size={15} className="text-emerald-500" /> : <WifiOff size={15} className="text-[#ba1a1a]" />}
            Evolution API: {evolutionLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Stats */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-12">
            <article className="flex h-32 flex-col justify-between rounded-lg border border-[#c4c7c7] bg-white p-6">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase text-[#444748]">Citas hoy</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eeeeee] px-2 py-1 text-xs font-semibold text-black"><TrendingUp size={14} /> {stats?.turnos_hoy ?? 0}</span>
              </div>
              <div className="text-4xl font-bold text-black">{stats?.turnos_hoy ?? "–"}</div>
            </article>
            <article className="flex h-32 flex-col justify-between rounded-lg border border-[#c4c7c7] bg-white p-6">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase text-[#444748]">Proximo turno</span>
                <Clock size={20} className="text-[#747878]" />
              </div>
              <div>
                <div className="text-xl font-semibold text-black">{proximo ? `${proximo.nombre_cliente} - ${proximo.hora}` : "Sin turnos"}</div>
                <div className="text-sm text-[#444748]">{proximo?.servicio_nombre ?? "Agenda libre"}</div>
              </div>
            </article>
            <article className="flex h-32 flex-col justify-between rounded-lg border border-[#c4c7c7] bg-white p-6">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase text-[#444748]">Ingresos estimados</span>
                <DollarSign size={20} className="text-[#747878]" />
              </div>
              <div className="text-4xl font-bold text-black">{money(ingresos)}</div>
            </article>
          </section>

          {/* Chat desktop */}
          <section className="flex h-[600px] flex-col overflow-hidden rounded-lg border border-[#c4c7c7] bg-white lg:col-span-8">
            <div className="flex items-center justify-between border-b border-[#c4c7c7] bg-[#eeeeee] px-6 py-4">
              <div className="flex items-center gap-2"><MessageCircle size={21} /><h2 className="text-xl font-semibold text-black">Mensajes</h2></div>
              <span className="text-xs font-medium text-[#444748]">{conversaciones.length} conversaciones</span>
            </div>
            <div className="flex min-h-0 flex-1">
              {/* Lista conversaciones */}
              <div className="w-1/3 overflow-y-auto border-r border-[#c4c7c7] bg-[#f9f9f9]">
                {conversaciones.map((c) => (
                  <button key={c.telefono} onClick={() => setSelectedPhone(c.telefono)} className={`block w-full border-b border-[#c4c7c7] p-4 text-left transition hover:bg-white ${selectedConversation?.telefono === c.telefono ? "bg-[#eeeeee]" : ""}`}>
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-black">{c.telefono}</div>
                      <span className="text-xs text-[#747878]">{c.latest.created_at.slice(11, 16)}</span>
                    </div>
                    <div className="truncate text-sm text-[#444748]">{c.latest.contenido ?? "Mensaje"}</div>
                  </button>
                ))}
                {!conversaciones.length && <div className="p-6 text-sm text-[#444748]">Todavia no hay mensajes registrados.</div>}
              </div>
              {/* Mensajes */}
              <div className="flex w-2/3 flex-col bg-white">
                <div className="flex items-center border-b border-[#c4c7c7] px-4 py-3 gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e2e2e2] text-sm font-semibold text-black">{initials(selectedConversation?.telefono)}</div>
                  <div>
                    <div className="text-sm font-semibold text-black">{selectedConversation?.telefono ?? "Sin conversacion"}</div>
                    <div className="text-xs text-[#444748]">WhatsApp</div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                  {selectedMessages.map((m) => (
                    <div key={m.id} className={`max-w-[80%] rounded-xl p-3 text-sm shadow-sm ${m.direccion === "saliente" ? "self-end rounded-tr-none bg-black text-white" : "self-start rounded-tl-none bg-[#f4f4f4] text-black"}`}>{m.contenido}</div>
                  ))}
                  {!selectedMessages.length && <div className="grid flex-1 place-items-center text-sm text-[#444748]">Selecciona una conversacion</div>}
                </div>
                <form onSubmit={sendReply} className="border-t border-[#c4c7c7] bg-white p-4">
                  <div className="flex items-center gap-2 rounded-md border border-[#c4c7c7] bg-[#f9f9f9] px-3 py-2">
                    <input className="flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0" placeholder="Escribe un mensaje..." value={reply} onChange={(e) => setReply(e.target.value)} disabled={!selectedConversation || sending} />
                    <button className="grid h-9 w-9 place-items-center rounded-full text-black disabled:opacity-40" title="Enviar" disabled={!selectedConversation || !reply.trim() || sending}><Send size={18} /></button>
                  </div>
                  {notice && <div className="mt-2 text-xs font-semibold text-[#444748]">{notice}</div>}
                </form>
              </div>
            </div>
          </section>

          {/* Columna lateral */}
          <aside className="flex flex-col gap-6 lg:col-span-4">
            {/* Retención */}
            <article className="flex min-h-[260px] flex-col rounded-lg border border-[#c4c7c7] bg-white p-6">
              <div className="mb-4 flex items-center gap-2"><Send size={20} className="text-[#735c00]" /><h2 className="text-xl font-semibold text-black">Retencion</h2></div>
              <div className="mb-4 flex flex-1 flex-col items-center justify-center border-y border-[#c4c7c7] py-6 text-center">
                <span className="mb-4 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Inactivos &gt; 30 dias</span>
                <div className="mb-1 text-5xl font-bold text-black">{clientesMarketing.length}</div>
                <p className="max-w-xs text-sm text-[#444748]">Clientes que no agendaron ni escribieron durante el ultimo mes.</p>
              </div>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#735c00] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60" type="button" disabled={sending} onClick={sendCoupon}><Send size={17} /> Enviar cupon</button>
            </article>

            {/* Agenda semanal */}
            <article className="rounded-lg border border-[#c4c7c7] bg-white p-6">
              <div className="mb-4 flex items-center gap-2"><CalendarDays size={20} /><h3 className="text-xl font-semibold text-black">Agenda semanal</h3></div>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3 text-sm"><span>Proximos 7 dias</span><strong>{stats?.turnos_semana ?? 0}</strong></div>
                <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3 text-sm"><span>Turnos del mes</span><strong>{stats?.turnos_mes ?? 0}</strong></div>
                <div className="flex items-center justify-between text-sm"><span>Plan</span><strong>{stats?.nombre_plan ?? "Sin plan"}</strong></div>
              </div>
            </article>

            {/* Programa de lealtad — IMPLEMENTADO */}
            <article className="rounded-lg border border-[#c4c7c7] bg-white p-6">
              <div className="mb-4 flex items-center gap-2"><Trophy size={20} className="text-[#735c00]" /><h3 className="text-xl font-semibold text-black">Clientes fieles</h3></div>
              <div className="space-y-2">
                {topClientes.map((c, i) => (
                  <div key={c.telefono} className="flex items-center gap-3 rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-3">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${i === 0 ? "bg-[#735c00]" : i === 1 ? "bg-[#444748]" : "bg-[#c4c7c7] text-black"}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-black">{c.nombre}</p>
                      <p className="text-xs text-[#444748]">{c.total_turnos} turnos · {money(c.total_gastado)}</p>
                    </div>
                    <UserRound size={16} className="shrink-0 text-[#c4c7c7]" />
                  </div>
                ))}
                {!topClientes.length && (
                  <div className="py-4 text-center text-sm text-[#444748]">
                    <Star size={28} className="mx-auto mb-2 text-[#c4c7c7]" />
                    Los datos aparecen cuando haya turnos registrados.
                  </div>
                )}
              </div>
            </article>

            {/* Agente IA */}
            <article className="rounded-lg border border-[#c4c7c7] bg-white p-6">
              <div className="mb-4 flex items-center gap-2"><UserRound size={20} /><h3 className="text-xl font-semibold text-black">Agente IA</h3></div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3"><span>Estado</span><strong>Activo</strong></div>
                <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3"><span>Responde con agenda</span><strong>Si</strong></div>
                <div className="flex items-center justify-between"><span>Configurable desde</span><strong>Engranaje</strong></div>
              </div>
            </article>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
