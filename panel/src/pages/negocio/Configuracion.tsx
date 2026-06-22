import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, CreditCard, QrCode, Save, Scissors, ShieldCheck, Wifi } from "lucide-react";
import Layout from "../../components/Layout";
import ServiciosTable from "../../components/ServiciosTable";
import { useApi } from "../../hooks/useApi";
import type { Negocio, Pago, Servicio, Suscripcion as SuscripcionType } from "../../types";

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

const dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

export default function Configuracion() {
  const api = useApi();
  const [config, setConfig] = useState<Negocio | null>(null);
  const [suscripcion, setSuscripcion] = useState<SuscripcionData | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [evolution, setEvolution] = useState<EvolutionQrData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    void api<Negocio>("/api/negocio/config").then(setConfig).catch(console.error);
    void api<SuscripcionData>("/api/negocio/suscripcion").then(setSuscripcion).catch(console.error);
  }, [api]);

  const activos = useMemo(() => servicios.filter((servicio) => servicio.activo === 1), [servicios]);
  const promedio = useMemo(() => {
    if (!activos.length) return 0;
    return Math.round(activos.reduce((total, servicio) => total + servicio.duracion_min, 0) / activos.length);
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
        duracion_turno_min: Number(data.duracion_turno_min)
      })
    });
    setConfig(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
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

  useEffect(() => {
    void refreshQr();
  }, []);

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
      <div className="md:hidden space-y-4 pb-8">
        <section className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white p-6">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h1 className="text-xl font-bold text-black">Configuracion</h1><p className="mt-1 text-sm text-[#444748]">WhatsApp, plan, horarios y servicios del agente.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#fed65b] px-2 py-1 text-xs font-semibold text-[#745c00]"><span className={`h-2 w-2 rounded-full ${connectionDot}`} /> {connectionLabel}</span></div>
          <div className="flex flex-col items-center justify-center py-4"><div className="mb-4 rounded-xl border border-[#c4c7c7] bg-white p-4 shadow-sm">{qrContent}</div><p className="max-w-[220px] text-center text-xs font-semibold text-[#444748]">Instancia: {config?.evolution_instance ?? evolution?.instance ?? "sin configurar"}</p>{evolution?.pairingCode ? <p className="mt-2 rounded bg-[#eeeeee] px-2 py-1 text-xs font-bold text-black">Codigo: {evolution.pairingCode}</p> : null}{qrError ? <p className="mt-3 text-center text-xs font-semibold text-[#ba1a1a]">{qrError}</p> : null}</div>
          <button className="mt-3 w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:opacity-60" type="button" onClick={refreshQr} disabled={qrLoading}>{qrLoading ? "Obteniendo QR..." : "Refrescar QR"}</button>
        </section>
        <section className="rounded-xl border border-[#c4c7c7] bg-white p-6"><h2 className="mb-3 text-xl font-bold text-black">Plan</h2><div className="flex items-center justify-between rounded-lg border border-[#c4c7c7]/50 bg-[#eeeeee] p-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#444748]">Plan actual</p><p className="font-bold text-black">{suscripcion?.suscripcion?.plan_nombre ?? "Plan unico"}</p><p className="text-sm text-[#444748]">$30000 / mes</p></div><span className="rounded-lg bg-[#fed65b] px-3 py-2 text-xs font-bold text-[#745c00]">Activo</span></div><p className="mt-3 text-sm text-[#444748]">Proxima renovacion: {suscripcion?.suscripcion?.fecha_vencimiento ?? "-"}</p></section>
        <form onSubmit={save} className="rounded-xl border border-[#c4c7c7] bg-white p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-black">Horario de Atencion</h2><button className="text-sm font-semibold text-black" type="submit">Guardar</button></div><div className="mb-4 grid gap-3"><input className="input bg-[#f9f9f9]" name="nombre" defaultValue={config?.nombre} placeholder="Nombre del negocio" /><div className="grid grid-cols-3 gap-2"><input className="input bg-[#f9f9f9]" name="horario_apertura" type="time" defaultValue={config?.horario_apertura} /><input className="input bg-[#f9f9f9]" name="horario_cierre" type="time" defaultValue={config?.horario_cierre} /><input className="input bg-[#f9f9f9]" name="duracion_turno_min" type="number" min={5} step={5} defaultValue={config?.duracion_turno_min} /></div></div><div className="space-y-1">{dias.slice(0, 5).map((dia) => <div key={dia} className="flex items-center justify-between border-b border-[#c4c7c7]/30 py-2"><span className="w-20 text-sm font-medium">{dia.slice(0, 3)}</span><div className="flex items-center gap-3"><span className="rounded bg-[#eeeeee] px-2 py-1 text-xs font-semibold">{config?.horario_apertura ?? "--:--"} - {config?.horario_cierre ?? "--:--"}</span><span className="relative h-6 w-10 rounded-full bg-black"><span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" /></span></div></div>)}<div className="flex items-center justify-between py-2 opacity-60"><span className="w-20 text-sm font-medium">Dom</span><div className="flex items-center gap-3"><span className="text-sm italic text-[#444748]">Cerrado</span><span className="relative h-6 w-10 rounded-full bg-[#c4c7c7]"><span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white" /></span></div></div></div>{saved ? <div className="mt-3 text-sm text-emerald-700">Configuracion guardada</div> : null}</form>
        <section className="rounded-xl border border-[#c4c7c7] bg-white p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-black">Gestion de Servicios</h2><button className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white" type="button">Add</button></div><div className="space-y-3">{activos.slice(0, 4).map((servicio) => <div key={servicio.id} className="flex items-center rounded-lg bg-[#f3f3f3] p-3"><div className="mr-3 grid h-12 w-12 place-items-center rounded-lg border border-[#c4c7c7]/40 bg-white"><Scissors size={20} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-black">{servicio.nombre}</p><p className="text-xs text-[#444748]">{servicio.duracion_min} min</p></div><div className="text-right"><p className="text-sm font-semibold text-black">${servicio.precio}</p></div></div>)}{!activos.length ? <div className="rounded-lg border border-dashed border-[#c4c7c7] p-4 text-center text-sm text-[#444748]">No hay servicios activos</div> : null}</div></section>
        <form onSubmit={password} className="rounded-xl border border-[#c4c7c7] bg-white p-6"><h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#ba1a1a]">Seguridad</h2><input className="input mb-3 bg-[#f9f9f9]" name="password" type="password" minLength={8} placeholder="Nueva contrasena" required /><button className="w-full rounded-lg border border-[#ba1a1a] py-3 text-sm font-semibold text-[#ba1a1a]" type="submit">Cambiar contrasena</button>{passwordSaved ? <div className="mt-3 text-sm text-emerald-700">Contrasena actualizada</div> : null}</form>
      </div>
      <div className="hidden md:block">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-black md:text-4xl">Configuracion</h1>
        <p className="mt-1 text-base text-[#444748]">Gestiona la conectividad, tu plan y las respuestas del agente de WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <section className="overflow-hidden rounded-xl border border-[#c4c7c7] bg-white">
            <div className="border-b border-[#c4c7c7] p-6">
              <div className="mb-1 flex items-center gap-2">
                <QrCode size={21} />
                <h2 className="text-xl font-semibold text-black">Sincronizacion de WhatsApp</h2>
              </div>
              <p className="text-sm text-[#444748]">Conecta la instancia de Evolution API del negocio.</p>
            </div>
            <div className="flex flex-col items-center bg-[#f9f9f9] p-6">
              <div className="mb-4 rounded-xl border border-[#c4c7c7] bg-white p-6 shadow-sm">
                {qrContent}
              </div>
              <div className="mb-5 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${connectionDot}`} />
                <span className="text-xs font-semibold uppercase text-[#444748]">Instancia: {config?.evolution_instance ?? evolution?.instance ?? "sin configurar"} · {connectionLabel}</span>
              </div>
              {evolution?.pairingCode ? <div className="mb-4 rounded-lg bg-[#eeeeee] px-3 py-2 text-sm font-bold text-black">Codigo de vinculacion: {evolution.pairingCode}</div> : null}
              {qrError ? <div className="mb-4 rounded-lg border border-[#ffdad6] bg-[#fff7f6] px-3 py-2 text-center text-sm font-semibold text-[#ba1a1a]">{qrError}</div> : null}
              <div className="grid w-full gap-2">
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#474746] disabled:opacity-60" type="button" onClick={refreshQr} disabled={qrLoading}>
                  <Wifi size={17} /> {qrLoading ? "Obteniendo QR..." : "Generar nuevo QR"}
                </button>
                <p className="text-center text-xs text-[#747878]">Escanealo desde WhatsApp &gt; Dispositivos vinculados. El QR se obtiene desde Evolution API para esta instancia.</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={21} />
              <h2 className="text-xl font-semibold text-black">Plan de Suscripcion</h2>
            </div>
            <div className="mb-4 rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4">
              <div className="mb-2 inline-flex rounded bg-[#fed65b] px-2 py-1 text-xs font-bold uppercase text-[#745c00]">Activo</div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-black">{suscripcion?.suscripcion?.plan_nombre ?? "Plan unico"}</h3>
                  <p className="mt-1 text-sm text-[#444748]">Todas las herramientas del agente y agenda sin limites.</p>
                </div>
                <div className="text-xl font-semibold text-black">$30000<span className="text-sm font-normal text-[#747878]">/mes</span></div>
              </div>
            </div>
            <div className="mb-4 flex items-center justify-between border-t border-[#c4c7c7] pt-4 text-sm">
              <span className="text-[#444748]">Proxima renovacion</span>
              <span className="font-medium text-black">{suscripcion?.suscripcion?.fecha_vencimiento ?? "-"}</span>
            </div>
            <div className="rounded-lg border border-[#c4c7c7] bg-[#eeeeee] px-4 py-2 text-center text-sm font-semibold text-black">{suscripcion?.dias_restantes ?? 0} dias restantes</div>
          </section>

          <form onSubmit={password} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={21} />
              <h2 className="text-xl font-semibold text-black">Seguridad</h2>
            </div>
            <input className="input mb-3" name="password" type="password" minLength={8} placeholder="Nueva contrasena" required />
            <button className="inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white" type="submit">Cambiar contrasena</button>
            {passwordSaved ? <div className="mt-3 text-sm text-emerald-700">Contrasena actualizada</div> : null}
          </form>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-8">
          <form onSubmit={save} className="rounded-xl border border-[#c4c7c7] bg-white p-6">
            <div className="mb-6 flex items-center justify-between border-b border-[#c4c7c7] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-black">Horario de Atencion</h2>
                <p className="mt-1 text-sm text-[#444748]">Define los horarios que usa el agente para ofrecer turnos.</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full text-black hover:bg-[#eeeeee]" title="Guardar" type="submit"><Save size={20} /></button>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
              <label className="text-sm font-medium text-[#444748]">Nombre del negocio<input className="input mt-1" name="nombre" defaultValue={config?.nombre} placeholder="Nombre" /></label>
              <label className="text-sm font-medium text-[#444748]">Apertura<input className="input mt-1" name="horario_apertura" type="time" defaultValue={config?.horario_apertura} /></label>
              <label className="text-sm font-medium text-[#444748]">Cierre<input className="input mt-1" name="horario_cierre" type="time" defaultValue={config?.horario_cierre} /></label>
              <label className="text-sm font-medium text-[#444748]">Bloque base<input className="input mt-1" name="duracion_turno_min" type="number" min={5} step={5} defaultValue={config?.duracion_turno_min} /></label>
            </div>

            <div className="space-y-1">
              {dias.map((dia) => {
                const cerrado = dia === "Domingo";
                return (
                  <div key={dia} className={`flex items-center justify-between border-t border-[#c4c7c7]/60 py-3 ${cerrado ? "opacity-60" : ""}`}>
                    <div className="flex w-36 items-center gap-3">
                      <div className={`relative h-6 w-10 rounded-full ${cerrado ? "bg-[#c4c7c7]" : "bg-black"}`}>
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${cerrado ? "left-1" : "left-5"}`} />
                      </div>
                      <span className="text-sm font-medium text-black">{dia}</span>
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-2">
                      {cerrado ? <span className="text-sm italic text-[#444748]">Cerrado</span> : <><span className="rounded-md border border-[#c4c7c7] bg-[#f9f9f9] px-3 py-2 text-sm">{config?.horario_apertura ?? "--:--"}</span><span className="text-[#747878]">-</span><span className="rounded-md border border-[#c4c7c7] bg-[#f9f9f9] px-3 py-2 text-sm">{config?.horario_cierre ?? "--:--"}</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
            {saved ? <div className="mt-4 text-sm text-emerald-700">Configuracion guardada</div> : null}
          </form>

          <section className="rounded-xl border border-[#c4c7c7] bg-white p-6">
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="flex items-center gap-2 text-sm text-[#444748]"><Clock size={16} /> Horario</div><div className="mt-2 text-2xl font-semibold text-black">{config?.horario_apertura ?? "--:--"} - {config?.horario_cierre ?? "--:--"}</div></div>
              <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="flex items-center gap-2 text-sm text-[#444748]"><Scissors size={16} /> Trabajos activos</div><div className="mt-2 text-2xl font-semibold text-black">{activos.length}</div></div>
              <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="flex items-center gap-2 text-sm text-[#444748]"><Clock size={16} /> Duracion promedio</div><div className="mt-2 text-2xl font-semibold text-black">{promedio || "-"} min</div></div>
            </div>
            <div className="mb-4 border-b border-[#c4c7c7] pb-4">
              <h2 className="text-xl font-semibold text-black">Gestion de Servicios</h2>
              <p className="mt-1 text-sm text-[#444748]">Catalogo de cortes, color, alisados y tratamientos que entiende el agente.</p>
            </div>
            <ServiciosTable endpoint="/api/negocio/servicios" onChange={setServicios} />
          </section>
        </div>
      </div>
      </div>
    </Layout>
  );
}
