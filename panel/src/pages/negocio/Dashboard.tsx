import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock, DollarSign, MessageCircle, Scissors, Send, TrendingUp, UserRound } from "lucide-react";
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

const today = new Date().toISOString().slice(0, 10);
const todayLabel = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

function money(value: number): string {
  return `$${value.toLocaleString("es-AR")}`;
}

function initials(value: string | null | undefined): string {
  if (!value) return "CL";
  return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

export default function Dashboard() {
  const api = useApi();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [mensajes, setMensajes] = useState<MensajeLog[]>([]);
  const [clientesMarketing, setClientesMarketing] = useState<ClienteMarketing[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  useEffect(() => {
    void api<Stats>("/api/negocio/stats").then(setStats).catch(console.error);
    void api<Turno[]>(`/api/negocio/turnos?fecha=${today}`).then(setTurnos).catch(console.error);
    void api<MensajeLog[]>("/api/negocio/mensajes").then((items) => {
      setMensajes(items);
      setSelectedPhone(items.find((item) => item.telefono)?.telefono ?? null);
    }).catch(console.error);
    void api<ClienteMarketing[]>("/api/negocio/marketing/clientes?dias=30").then(setClientesMarketing).catch(console.error);
  }, [api]);

  const confirmados = useMemo(() => turnos.filter((turno) => turno.estado === "confirmado"), [turnos]);
  const ingresos = useMemo(() => confirmados.reduce((total, turno) => total + (turno.servicio_precio ?? 0), 0), [confirmados]);
  const proximo = useMemo(() => confirmados.find((turno) => turno.hora >= new Date().toTimeString().slice(0, 5)) ?? confirmados[0], [confirmados]);

  const conversaciones = useMemo(() => {
    const map = new Map<string, MensajeLog[]>();
    mensajes.forEach((mensaje) => {
      if (!mensaje.telefono) return;
      map.set(mensaje.telefono, [...(map.get(mensaje.telefono) ?? []), mensaje]);
    });
    return Array.from(map.entries()).map(([telefono, items]) => ({ telefono, items, latest: items[0] })).sort((a, b) => b.latest.id - a.latest.id);
  }, [mensajes]);

  const selectedConversation = useMemo(() => {
    const phone = selectedPhone ?? conversaciones[0]?.telefono;
    return conversaciones.find((item) => item.telefono === phone) ?? conversaciones[0];
  }, [conversaciones, selectedPhone]);

  const selectedMessages = useMemo(() => [...(selectedConversation?.items ?? [])].sort((a, b) => a.id - b.id), [selectedConversation]);

  return (
    <Layout mode="negocio">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black md:text-4xl">Resumen del dia</h1>
          <p className="mt-1 text-base text-[#444748]">{todayLabel}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#c4c7c7] bg-white px-3 py-2 text-sm text-[#444748]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Evolution API: conectado
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-12">
          <article className="flex h-32 flex-col justify-between rounded-lg border border-[#c4c7c7] bg-white p-6">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold uppercase text-[#444748]">Citas hoy</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eeeeee] px-2 py-1 text-xs font-semibold text-black"><TrendingUp size={14} /> {stats?.turnos_hoy ?? 0}</span>
            </div>
            <div className="text-4xl font-bold text-black">{stats?.turnos_hoy ?? "-"}</div>
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

        <section className="flex h-[600px] flex-col overflow-hidden rounded-lg border border-[#c4c7c7] bg-white lg:col-span-8">
          <div className="flex items-center justify-between border-b border-[#c4c7c7] bg-[#eeeeee] px-6 py-4">
            <div className="flex items-center gap-2">
              <MessageCircle size={21} />
              <h2 className="text-xl font-semibold text-black">Mensajes</h2>
            </div>
            <span className="text-xs font-medium text-[#444748]">{conversaciones.length} conversaciones</span>
          </div>
          <div className="flex min-h-0 flex-1">
            <div className="w-1/3 overflow-y-auto border-r border-[#c4c7c7] bg-[#f9f9f9]">
              {conversaciones.map((conversacion) => (
                <button key={conversacion.telefono} onClick={() => setSelectedPhone(conversacion.telefono)} className={`block w-full border-b border-[#c4c7c7] p-4 text-left transition hover:bg-white ${selectedConversation?.telefono === conversacion.telefono ? "bg-[#eeeeee]" : ""}`}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-black">{conversacion.telefono}</div>
                    <span className="text-xs text-[#747878]">{conversacion.latest.created_at.slice(11, 16)}</span>
                  </div>
                  <div className="truncate text-sm text-[#444748]">{conversacion.latest.contenido ?? "Mensaje"}</div>
                </button>
              ))}
              {!conversaciones.length ? <div className="p-6 text-sm text-[#444748]">Todavia no hay mensajes registrados.</div> : null}
            </div>
            <div className="flex w-2/3 flex-col bg-white">
              <div className="flex items-center justify-between border-b border-[#c4c7c7] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e2e2e2] text-sm font-semibold text-black">{initials(selectedConversation?.telefono)}</div>
                  <div>
                    <div className="text-sm font-semibold text-black">{selectedConversation?.telefono ?? "Sin conversacion"}</div>
                    <div className="text-xs text-[#444748]">WhatsApp</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {selectedMessages.map((mensaje) => (
                  <div key={mensaje.id} className={`max-w-[80%] rounded-xl p-3 text-sm shadow-sm ${mensaje.direccion === "saliente" ? "self-end rounded-tr-none bg-black text-white" : "self-start rounded-tl-none bg-[#f4f4f4] text-black"}`}>
                    {mensaje.contenido}
                  </div>
                ))}
                {!selectedMessages.length ? <div className="grid flex-1 place-items-center text-sm text-[#444748]">Selecciona una conversacion</div> : null}
              </div>
              <div className="border-t border-[#c4c7c7] bg-white p-4">
                <div className="flex items-center gap-2 rounded-md border border-[#c4c7c7] bg-[#f9f9f9] px-3 py-2">
                  <input className="flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0" placeholder="Escribe un mensaje..." disabled />
                  <button className="grid h-9 w-9 place-items-center rounded-full text-black" title="Envio manual pendiente"><Send size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-6 lg:col-span-4">
          <article className="flex min-h-[360px] flex-col rounded-lg border border-[#c4c7c7] bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Send size={20} className="text-[#735c00]" />
              <h2 className="text-xl font-semibold text-black">Retencion</h2>
            </div>
            <div className="mb-4 flex flex-1 flex-col items-center justify-center border-y border-[#c4c7c7] py-8 text-center">
              <span className="mb-4 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Inactivos &gt; 30 dias</span>
              <div className="mb-1 text-5xl font-bold text-black">{clientesMarketing.length}</div>
              <p className="max-w-xs text-sm text-[#444748]">Clientes que no agendaron ni escribieron durante el ultimo mes.</p>
            </div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#735c00] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90" onClick={() => navigate("/negocio/marketing")}>
              <Send size={17} /> Enviar cupon
            </button>
          </article>

          <article className="rounded-lg border border-[#c4c7c7] bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={20} />
              <h3 className="text-xl font-semibold text-black">Agenda semanal</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3 text-sm"><span>Proximos 7 dias</span><strong>{stats?.turnos_semana ?? 0}</strong></div>
              <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3 text-sm"><span>Turnos del mes</span><strong>{stats?.turnos_mes ?? 0}</strong></div>
              <div className="flex items-center justify-between text-sm"><span>Plan</span><strong>{stats?.nombre_plan ?? "Sin plan"}</strong></div>
            </div>
          </article>

          <article className="rounded-lg border border-[#c4c7c7] bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={20} />
              <h3 className="text-xl font-semibold text-black">Agente IA</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3"><span>Estado</span><strong>Activo</strong></div>
              <div className="flex items-center justify-between border-b border-[#c4c7c7] pb-3"><span>Responde con agenda</span><strong>Si</strong></div>
              <div className="flex items-center justify-between"><span>Configurable desde</span><strong>Engranaje</strong></div>
            </div>
          </article>
        </aside>
      </div>
    </Layout>
  );
}
