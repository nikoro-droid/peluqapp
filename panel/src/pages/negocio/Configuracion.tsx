import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Clock, CreditCard, Lock, LockOpen, Plus, QrCode, Save, Scissors, ShieldCheck, Trash2, Wifi, X } from "lucide-react";
import Layout from "../../components/Layout";
import ServiciosTable from "../../components/ServiciosTable";
import { useApi } from "../../hooks/useApi";
import type { Bloqueo, HorariosSemana, Negocio, Pago, Servicio, Suscripcion as SuscripcionType } from "../../types";

interface SuscripcionData {
  suscripcion: SuscripcionType | null;
  dias_restantes: number;
  turnos_usados_mes: number;
  pagos: Pago[];
}

interface EvolutionQrData {
  instance: string;
  state: string | null;
  connected: boolean;
  qr: string | null;
  pairingCode: string | null;
  count: number | null;
}

const dias = [
  ["lunes", "Lunes"],
  ["martes", "Martes"],
  ["miercoles", "Miercoles"],
  ["jueves", "Jueves"],
  ["viernes", "Viernes"],
  ["sabado", "Sabado"],
  ["domingo", "Domingo"]
] as const;

function defaultHorarios(apertura = "09:00", cierre = "19:00"): HorariosSemana {
  return Object.fromEntries(dias.map(([key]) => [
    key,
    key === "domingo"
      ? { activo: false, bloques: [] }
      : { activo: true, bloques: [{ apertura, cierre }] }
  ])) as HorariosSemana;
}

function parseHorarios(config: Negocio | null): HorariosSemana {
  if (!config?.horarios_json) return defaultHorarios(config?.horario_apertura, config?.horario_cierre);
  try {
    return { ...defaultHorarios(config.horario_apertura, config.horario_cierre), ...(JSON.parse(config.horarios_json) as HorariosSemana) };
  } catch {
    return defaultHorarios(config.horario_apertura, config.horario_cierre);
  }
}

function resumenDia(horario?: HorariosSemana[string]): string {
  if (!horario?.activo || !horario.bloques.length) return "Cerrado";
  return horario.bloques.map((b) => `${b.apertura} - ${b.cierre}`).join(" / ");
}

export default function Configuracion() {
  const api = useApi();
  const [config, setConfig] = useState<Negocio | null>(null);
  const [suscripcion, setSuscripcion] = useState<SuscripcionData | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [evolution, setEvolution] = useState<EvolutionQrData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<HorariosSemana>(() => defaultHorarios());
  const [bloqueoForm, setBloqueoForm] = useState(false);

  const loadBloqueos = useCallback(() =>
    api<Bloqueo[]>("/api/negocio/bloqueos").then(setBloqueos).catch(console.error)
  , [api]);

  useEffect(() => {
    void api<Negocio>("/api/negocio/config").then((next) => {
      setConfig(next);
      setHorarios(parseHorarios(next));
    }).catch(console.error);
    void api<SuscripcionData>("/api/negocio/suscripcion").then(setSuscripcion).catch(console.error);
    void loadBloqueos();
  }, [api, loadBloqueos]);

  const activos = useMemo(() => servicios.filter((s) => s.activo === 1), [servicios]);
  const promedio = useMemo(() => {
    if (!activos.length) return 0;
    return Math.round(activos.reduce((t, s) => t + s.duracion_min, 0) / activos.length);
  }, [activos]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const next = await api<Negocio>("/api/negocio/config", {
      method: "PATCH",
      body: JSON.stringify({
        nombre: data.nombre,
        horario_apertura: data.horario_apertura,
        horario_cierre: data.horario_cierre,
        horarios_json: JSON.stringify(horarios),
        duracion_turno_min: Number(data.duracion_turno_min)
      })
    });
    setConfig(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function toggleDia(key: keyof HorariosSemana) {
    setHorarios((cur) => {
      const dia = cur[key] ?? { activo: false, bloques: [] };
      const activo = !dia.activo;
      return { ...cur, [key]: { activo, bloques: activo && !dia.bloques.length ? [{ apertura: "09:00", cierre: "19:00" }] : dia.bloques } };
    });
  }

  function updateBloque(key: keyof HorariosSemana, index: number, field: "apertura" | "cierre", value: string) {
    setHorarios((cur) => {
      const dia = cur[key] ?? { activo: true, bloques: [] };
      const bloques = [...dia.bloques];
      bloques[index] = { ...(bloques[index] ?? { apertura: "09:00", cierre: "13:00" }), [field]: value };
      return { ...cur, [key]: { ...dia, bloques } };
    });
  }

  function addBloque(key: keyof HorariosSemana) {
    setHorarios((cur) => {
      const dia = cur[key] ?? { activo: true, bloques: [] };
      return { ...cur, [key]: { ...dia, bloques: [...dia.bloques, { apertura: "14:00", cierre: "19:00" }] } };
    });
  }

  function removeBloque(key: keyof HorariosSemana, index: number) {
    setHorarios((cur) => {
      const dia = cur[key] ?? { activo: true, bloques: [] };
      const bloques = dia.bloques.filter((_, i) => i !== index);
      return { ...cur, [key]: { ...dia, bloques } };
    });
  }

  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await api("/api/negocio/config/password", { method: "POST", body: JSON.stringify({ password: data.password }) });
    form.reset();
    setPasswordSaved(true);
    window.setTimeout(() => setPasswordSaved(false), 1800);
  }

  async function refreshQr() {
    setQrLoading(true);
    setQrError(null);
    try {
      setEvolution(await api<EvolutionQrData>("/api/negocio/evolution/qr"));
    } catch (error) {
      setQrError(error instanceof Error ? error.message : "No se pudo obtener el QR");
    } finally {
      setQrLoading(false);
    }
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
    (event.target as HTMLFormElement).reset();
    setBloqueoForm(false);
    await loadBloqueos();
  }

  async function deleteBloqueo(id: number) {
    await api(`/api/negocio/bloqueos/${id}`, { method: "DELETE" });
    await loadBloqueos();
  }

  useEffect(() => { void refreshQr(); }, []);

  const connectionLabel = evolution?.connected ? "Conectado" : evolution?.state ? `Estado: ${evolution.state}` : "Pendiente";
  const connectionDot = evolution?.connected ? "bg-emerald-500" : "bg-[#fed65b]";
  const qrContent = evolution?.connected ? (
    <div className="grid h-48 w-48 place-items-center rounded border border-emerald-200 bg-emerald-50 text-center text-sm font-semibold text-emerald-700">WhatsApp conectado</div>
  ) : evolution?.qr ? (
    <img className="h-48 w-48 rounded border border-[#c4c7c7] bg-white object-contain" src={evolution.qr} alt="QR de conexion de WhatsApp" />
  ) : (
    <div className="relative grid h-48 w-48 place-items-center overflow-hidden rounded border border-[#c4c7c7] bg-[#eeeeee]">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0 8px, transparent 8px 16px)", backgroundSize: "24px 24px" }} />
      <QrCode size={56} className="relative text-[#747878]" />
    </div>
  );

  return (
    <Layout mode="negocio">
      {/* ── MOBILE ── */}
      <div className="md:hidden space-y-4 pb-8">
        {/* WhatsApp mobile */}
        <section className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h1 className="text-xl font-bold text-black">Configuracion</h1><p className="mt-1 text-sm text-[#444748]">WhatsApp, plan, horarios y servicios del agente.</p></div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fed65b] px-2 py-1 text-xs font-semibold text-[#745c00]"><span className={`h-2 w-2 rounded-full ${connectionDot}`} /> {connectionLabel}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="mb-4 rounded-xl border border-[#c4c7c7] bg-white p-4 shadow-sm">{qrContent}</div>
            <p className="max-w-[220px] text-center text-xs font-semibold text-[#444748]">Instancia: {config?.evolution_instance ?? evolution?.instance ?? "sin configurar"}</p>
            {evolution?.pairingCode && <p className="mt-2 rounded bg-[#eeeeee] px-2 py-1 text-xs font-bold text-black">Codigo: {evolution.pairingCode}</p>}
            {qrError && <p className="mt-3 text-center text-xs font-semibold text-[#ba1a1a]">{qrError}</p>}
          </div>
          <button className="mt-3 w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:opacity-60" type="button" onClick={refreshQr} disabled={qrLoading}>{qrLoading ? "Obteniendo QR..." : "Refrescar QR"}</button>
        </section>

        {/* Plan mobile */}
        <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
          <h2 className="mb-3 text-xl font-bold text-black">Plan</h2>
          <div className="flex items-center justify-between rounded-lg border border-[#c4c7c7]/50 bg-[#eeeeee] p-4">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-[#444748]">Plan actual</p><p className="font-bold text-black">{suscripcion?.suscripcion?.plan_nombre ?? "Plan unico"}</p><p className="text-sm text-[#444748]">$30000 / mes</p></div>
            <span className="rounded-lg bg-[#fed65b] px-3 py-2 text-xs font-bold text-[#745c00]">Activo</span>
          </div>
          <p className="mt-3 text-sm text-[#444748]">Proxima renovacion: {suscripcion?.suscripcion?.fecha_vencimiento ?? "–"}</p>
        </section>

        {/* Horario mobile */}
        <form onSubmit={save} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">Horario de Atencion</h2>
            <button className="text-sm font-semibold text-black" type="submit">Guardar</button>
          </div>
          <div className="mb-4 grid gap-3">
            <input className="input bg-[#f9f9f9]" name="nombre" defaultValue={config?.nombre ?? ""} placeholder="Nombre del negocio" />
            <div className="grid grid-cols-3 gap-2">
              <input className="input bg-[#f9f9f9]" name="horario_apertura" type="time" defaultValue={config?.horario_apertura ?? "09:00"} />
              <input className="input bg-[#f9f9f9]" name="horario_cierre" type="time" defaultValue={config?.horario_cierre ?? "19:00"} />
              <input className="input bg-[#f9f9f9]" name="duracion_turno_min" type="number" min={5} step={5} defaultValue={config?.duracion_turno_min ?? 30} />
            </div>
          </div>
          <div className="space-y-3">
            {dias.map(([key, dia]) => (
              <div key={key} className="rounded-lg border border-[#c4c7c7]/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{dia}</span>
                  <button type="button" onClick={() => toggleDia(key)} className={`relative h-6 w-10 rounded-full ${horarios[key]?.activo ? "bg-black" : "bg-[#c4c7c7]"}`}>
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${horarios[key]?.activo ? "left-5" : "left-1"}`} />
                  </button>
                </div>
                {horarios[key]?.activo ? (
                  <div className="space-y-2">
                    {(horarios[key]?.bloques ?? []).map((bloque, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input className="input bg-[#f9f9f9] flex-1 px-2 text-xs" type="time" value={bloque.apertura} onChange={(e) => updateBloque(key, i, "apertura", e.target.value)} />
                        <span className="text-[#747878] text-xs">–</span>
                        <input className="input bg-[#f9f9f9] flex-1 px-2 text-xs" type="time" value={bloque.cierre} onChange={(e) => updateBloque(key, i, "cierre", e.target.value)} />
                        {(horarios[key]?.bloques?.length ?? 0) > 1 && (
                          <button type="button" className="text-[#ba1a1a]" onClick={() => removeBloque(key, i)}><X size={14} /></button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="flex items-center gap-1 text-xs font-semibold text-[#444748] hover:text-black" onClick={() => addBloque(key)}>
                      <Plus size={13} /> Agregar bloque
                    </button>
                  </div>
                ) : <span className="text-sm italic text-[#444748]">Cerrado</span>}
              </div>
            ))}
          </div>
          {saved && <div className="mt-3 text-sm text-emerald-700">Configuracion guardada</div>}
        </form>

        {/* Servicios mobile */}
        <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
          <div className="mb-4"><h2 className="text-xl font-bold text-black">Gestion de Servicios</h2></div>
          <ServiciosTable endpoint="/api/negocio/servicios" onChange={setServicios} />
        </section>

        {/* Bloqueos mobile */}
        <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">Bloqueos</h2>
            <button className="flex items-center gap-1 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white" onClick={() => setBloqueoForm(true)}><Lock size={13} /> Bloquear</button>
          </div>
          <div className="space-y-2">
            {bloqueos.map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-2 rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-3">
                <div>
                  <p className="text-sm font-semibold text-black">{b.motivo ?? "Sin motivo"}</p>
                  <p className="text-xs text-[#444748]">{b.fecha_inicio.slice(0, 16)} → {b.fecha_fin.slice(0, 16)}</p>
                </div>
                <button className="text-[#ba1a1a]" onClick={() => deleteBloqueo(b.id)}><Trash2 size={15} /></button>
              </div>
            ))}
            {!bloqueos.length && <div className="py-4 text-center text-sm text-[#444748]"><LockOpen size={22} className="mx-auto mb-2 text-[#c4c7c7]" />Sin bloqueos activos</div>}
          </div>
        </section>

        {/* Seguridad mobile */}
        <form onSubmit={password} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#ba1a1a]">Seguridad</h2>
          <input className="input mb-3 bg-[#f9f9f9]" name="password" type="password" minLength={8} placeholder="Nueva contrasena" required />
          <button className="w-full rounded-lg border border-[#ba1a1a] py-3 text-sm font-semibold text-[#ba1a1a]" type="submit">Cambiar contrasena</button>
          {passwordSaved && <div className="mt-3 text-sm text-emerald-700">Contrasena actualizada</div>}
        </form>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black md:text-4xl">Configuracion</h1>
          <p className="mt-1 text-base text-[#444748]">Gestiona la conectividad, tu plan y las respuestas del agente de WhatsApp.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Columna izquierda */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* WhatsApp */}
            <section className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
              <div className="border-b border-[#c4c7c7] p-6">
                <div className="mb-1 flex items-center gap-2"><QrCode size={21} /><h2 className="text-xl font-semibold text-black">Sincronizacion WhatsApp</h2></div>
                <p className="text-sm text-[#444748]">Conecta la instancia de Evolution API del negocio.</p>
              </div>
              <div className="flex flex-col items-center bg-[#f9f9f9] p-6">
                <div className="mb-4 rounded-xl border border-[#c4c7c7] bg-white p-6 shadow-sm">{qrContent}</div>
                <div className="mb-5 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${connectionDot}`} />
                  <span className="text-xs font-semibold uppercase text-[#444748]">Instancia: {config?.evolution_instance ?? evolution?.instance ?? "sin configurar"} · {connectionLabel}</span>
                </div>
                {evolution?.pairingCode && <div className="mb-4 rounded-lg bg-[#eeeeee] px-3 py-2 text-sm font-bold text-black">Codigo de vinculacion: {evolution.pairingCode}</div>}
                {qrError && <div className="mb-4 rounded-lg border border-[#ffdad6] bg-[#fff7f6] px-3 py-2 text-center text-sm font-semibold text-[#ba1a1a]">{qrError}</div>}
                <div className="grid w-full gap-2">
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#474746] disabled:opacity-60" type="button" onClick={refreshQr} disabled={qrLoading}>
                    <Wifi size={17} /> {qrLoading ? "Obteniendo QR..." : "Generar nuevo QR"}
                  </button>
                  <p className="text-center text-xs text-[#747878]">Escanealo desde WhatsApp &gt; Dispositivos vinculados.</p>
                </div>
              </div>
            </section>

            {/* Plan */}
            <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
              <div className="mb-4 flex items-center gap-2"><CreditCard size={21} /><h2 className="text-xl font-semibold text-black">Plan de Suscripcion</h2></div>
              <div className="mb-4 rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4">
                <div className="mb-2 inline-flex rounded bg-[#fed65b] px-2 py-1 text-xs font-bold uppercase text-[#745c00]">Activo</div>
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="text-lg font-bold text-black">{suscripcion?.suscripcion?.plan_nombre ?? "Plan unico"}</h3><p className="mt-1 text-sm text-[#444748]">Todas las herramientas del agente y agenda sin limites.</p></div>
                  <div className="text-xl font-semibold text-black">$30000<span className="text-sm font-normal text-[#747878]">/mes</span></div>
                </div>
              </div>
              <div className="mb-4 flex items-center justify-between border-t border-[#c4c7c7] pt-4 text-sm">
                <span className="text-[#444748]">Proxima renovacion</span>
                <span className="font-medium text-black">{suscripcion?.suscripcion?.fecha_vencimiento ?? "–"}</span>
              </div>
              <div className="rounded-lg border border-[#c4c7c7] bg-[#eeeeee] px-4 py-2 text-center text-sm font-semibold text-black">{suscripcion?.dias_restantes ?? 0} dias restantes</div>
            </section>

            {/* Seguridad */}
            <form onSubmit={password} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
              <div className="mb-4 flex items-center gap-2"><ShieldCheck size={21} /><h2 className="text-xl font-semibold text-black">Seguridad</h2></div>
              <input className="input mb-3" name="password" type="password" minLength={8} placeholder="Nueva contrasena" required />
              <button className="inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white" type="submit">Cambiar contrasena</button>
              {passwordSaved && <div className="mt-3 text-sm text-emerald-700">Contrasena actualizada</div>}
            </form>
          </div>

          {/* Columna derecha */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {/* Horario */}
            <form onSubmit={save} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
              <div className="mb-6 flex items-center justify-between border-b border-[#c4c7c7] pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-black">Horario de Atencion</h2>
                  <p className="mt-1 text-sm text-[#444748]">Define los horarios que usa el agente para ofrecer turnos.</p>
                </div>
                <button className="grid h-10 w-10 place-items-center rounded-full text-black hover:bg-[#eeeeee]" title="Guardar" type="submit"><Save size={20} /></button>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                <label className="text-sm font-medium text-[#444748]">Nombre del negocio<input className="input mt-1" name="nombre" defaultValue={config?.nombre ?? ""} placeholder="Nombre" /></label>
                <label className="text-sm font-medium text-[#444748]">Apertura<input className="input mt-1" name="horario_apertura" type="time" defaultValue={config?.horario_apertura ?? "09:00"} /></label>
                <label className="text-sm font-medium text-[#444748]">Cierre<input className="input mt-1" name="horario_cierre" type="time" defaultValue={config?.horario_cierre ?? "19:00"} /></label>
                <label className="text-sm font-medium text-[#444748]">Bloque base<input className="input mt-1" name="duracion_turno_min" type="number" min={5} step={5} defaultValue={config?.duracion_turno_min ?? 30} /></label>
              </div>

              {/* Días de la semana con bloques flexibles */}
              <div className="space-y-1">
                {dias.map(([key, dia]) => {
                  const cerrado = !horarios[key]?.activo;
                  const bloques = horarios[key]?.bloques ?? [];
                  return (
                    <div key={dia} className={`rounded-lg border border-[#c4c7c7]/60 px-4 py-3 transition ${cerrado ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-4">
                        {/* Toggle */}
                        <button type="button" onClick={() => toggleDia(key)} className={`relative h-6 w-10 shrink-0 rounded-full ${cerrado ? "bg-[#c4c7c7]" : "bg-black"}`}>
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${cerrado ? "left-1" : "left-5"}`} />
                        </button>
                        <span className="w-24 shrink-0 text-sm font-medium text-black">{dia}</span>
                        {/* Bloques */}
                        {cerrado ? (
                          <span className="text-sm italic text-[#444748]">Cerrado</span>
                        ) : (
                          <div className="flex flex-1 flex-wrap items-center gap-3">
                            {bloques.map((bloque, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input className="input w-28" type="time" value={bloque.apertura} onChange={(e) => updateBloque(key, i, "apertura", e.target.value)} />
                                <span className="text-[#747878]">–</span>
                                <input className="input w-28" type="time" value={bloque.cierre} onChange={(e) => updateBloque(key, i, "cierre", e.target.value)} />
                                {bloques.length > 1 && (
                                  <button type="button" className="text-[#ba1a1a] hover:opacity-80" onClick={() => removeBloque(key, i)} title="Quitar bloque"><X size={15} /></button>
                                )}
                              </div>
                            ))}
                            <button type="button" className="flex items-center gap-1 text-xs font-semibold text-[#444748] hover:text-black" onClick={() => addBloque(key)}>
                              <Plus size={14} /> Agregar bloque
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {saved && <div className="mt-4 text-sm text-emerald-700">Configuracion guardada</div>}
            </form>

            {/* Servicios */}
            <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="flex items-center gap-2 text-sm text-[#444748]"><Clock size={16} /> Horario</div><div className="mt-2 text-lg font-semibold text-black">{resumenDia(horarios.lunes)}</div></div>
                <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="flex items-center gap-2 text-sm text-[#444748]"><Scissors size={16} /> Trabajos activos</div><div className="mt-2 text-2xl font-semibold text-black">{activos.length}</div></div>
                <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="flex items-center gap-2 text-sm text-[#444748]"><Clock size={16} /> Duracion promedio</div><div className="mt-2 text-2xl font-semibold text-black">{promedio || "–"} min</div></div>
              </div>
              <div className="mb-4 border-b border-[#c4c7c7] pb-4">
                <h2 className="text-xl font-semibold text-black">Gestion de Servicios</h2>
                <p className="mt-1 text-sm text-[#444748]">Catalogo de cortes, color, alisados y tratamientos que entiende el agente.</p>
              </div>
              <ServiciosTable endpoint="/api/negocio/servicios" onChange={setServicios} />
            </section>

            {/* Bloqueos */}
            <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
              <div className="mb-5 flex items-center justify-between border-b border-[#c4c7c7] pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-black">Bloqueos de Horario</h2>
                  <p className="mt-1 text-sm text-[#444748]">Periodos en los que el agente no ofrece turnos.</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#474746]" onClick={() => setBloqueoForm(true)}>
                  <Lock size={15} /> Nuevo bloqueo
                </button>
              </div>

              {bloqueoForm && (
                <form onSubmit={createBloqueo} className="mb-6 grid gap-3 rounded-xl border border-[#c4c7c7] bg-[#f9f9f9] p-4">
                  <h3 className="text-sm font-semibold text-black">Nuevo bloqueo</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-[#444748]">Desde (fecha)<input className="input mt-1" name="fecha_inicio" type="date" required /></label>
                    <label className="text-xs font-semibold text-[#444748]">Hora inicio<input className="input mt-1" name="hora_inicio" type="time" defaultValue="09:00" required /></label>
                    <label className="text-xs font-semibold text-[#444748]">Hasta (fecha)<input className="input mt-1" name="fecha_fin" type="date" required /></label>
                    <label className="text-xs font-semibold text-[#444748]">Hora fin<input className="input mt-1" name="hora_fin" type="time" defaultValue="19:00" required /></label>
                  </div>
                  <input className="input" name="motivo" placeholder="Motivo (ej: vacaciones, feriado...)" />
                  <div className="flex justify-end gap-2">
                    <button type="button" className="rounded-lg border border-[#c4c7c7] px-4 py-2 text-sm font-semibold" onClick={() => setBloqueoForm(false)}>Cancelar</button>
                    <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Guardar bloqueo</button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {bloqueos.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#c4c7c7] bg-[#f9f9f9] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Lock size={16} className="shrink-0 text-[#444748]" />
                      <div>
                        <p className="text-sm font-semibold text-black">{b.motivo ?? "Sin motivo"}</p>
                        <p className="text-xs text-[#444748]">{b.fecha_inicio.slice(0, 16)} → {b.fecha_fin.slice(0, 16)}</p>
                      </div>
                    </div>
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6]" onClick={() => deleteBloqueo(b.id)} title="Eliminar"><Trash2 size={15} /></button>
                  </div>
                ))}
                {!bloqueos.length && (
                  <div className="rounded-xl border border-dashed border-[#c4c7c7] bg-white py-8 text-center">
                    <LockOpen size={28} className="mx-auto mb-2 text-[#c4c7c7]" />
                    <p className="text-sm text-[#444748]">Sin bloqueos activos. Los bloqueos impiden que el bot ofrezca turnos en ese periodo.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
