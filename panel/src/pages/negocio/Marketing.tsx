import { FormEvent, useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import type { ClienteMarketing } from "../../types";

const templates = [
  "Hola {nombre}! Te extranamos en la pelu. Esta semana tenes 20% OFF en tu proximo turno. Responde este mensaje y te buscamos un horario.",
  "Hola {nombre}! Tenemos promos de la semana en corte, color y tratamientos. Si queres, te paso horarios disponibles.",
  "Hola {nombre}! Hace un tiempo no te vemos. Te guardamos un cupon especial para volver: 15% OFF en tu proximo servicio."
];

function personalize(template: string, cliente: ClienteMarketing): string {
  return template.replace(/\{nombre\}/g, cliente.nombre || "!");
}

export default function Marketing() {
  const api = useApi();
  const [dias, setDias] = useState(60);
  const [clientes, setClientes] = useState<ClienteMarketing[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState(templates[0]);
  const [status, setStatus] = useState("");

  const selectedClientes = useMemo(() => clientes.filter((cliente) => selected.includes(cliente.telefono)), [clientes, selected]);

  const load = () => {
    void api<ClienteMarketing[]>(`/api/negocio/marketing/clientes?dias=${dias}`).then((items) => {
      setClientes(items);
      setSelected([]);
    }).catch(console.error);
  };

  useEffect(load, [api, dias]);

  function toggle(telefono: string) {
    setSelected((current) => current.includes(telefono) ? current.filter((item) => item !== telefono) : [...current, telefono]);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    setStatus("Enviando difusion...");
    const destinatarios = selectedClientes.map((cliente) => ({ telefono: cliente.telefono, nombre: cliente.nombre }));
    const result = await api<{ enviados: string[]; fallidos: Array<{ telefono: string; error: string }> }>("/api/negocio/marketing/difusion", {
      method: "POST",
      body: JSON.stringify({ destinatarios, mensaje })
    });
    setStatus(`Enviados: ${result.enviados.length}. Fallidos: ${result.fallidos.length}.`);
  }

  return (
    <Layout mode="negocio">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">Clientes sin contacto reciente y difusiones por WhatsApp</p>
        </div>
        <div className="rounded-full bg-teal-50 px-3 py-2 text-sm font-medium text-brand">{clientes.length} clientes detectados</div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-line bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="text-sm font-medium text-slate-700">
              Sin contacto hace mas de
              <input className="input mt-1 w-36" type="number" min={1} value={dias} onChange={(event) => setDias(Number(event.target.value))} />
            </label>
            <button className="btn btn-muted" onClick={load}>Actualizar</button>
          </div>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="table w-full">
              <thead><tr><th></th><th>Cliente</th><th>Telefono</th><th>Ultimo contacto</th><th>Turnos</th><th>Gastado</th></tr></thead>
              <tbody>
                {clientes.map((cliente) => {
                  const last = cliente.ultimo_mensaje ?? cliente.ultimo_turno ?? "-";
                  return (
                    <tr key={cliente.telefono}>
                      <td><input type="checkbox" checked={selected.includes(cliente.telefono)} onChange={() => toggle(cliente.telefono)} /></td>
                      <td>{cliente.nombre}</td>
                      <td>{cliente.telefono}</td>
                      <td>{last}</td>
                      <td>{cliente.total_turnos}</td>
                      <td>${cliente.total_gastado ?? 0}</td>
                    </tr>
                  );
                })}
                {!clientes.length ? <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay clientes para este filtro</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={send} className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Difusion</h2>
          <select className="input mb-3" value={mensaje} onChange={(event) => setMensaje(event.target.value)}>
            {templates.map((template) => <option key={template} value={template}>{template.slice(0, 64)}...</option>)}
          </select>
          <textarea className="input mb-3 min-h-36" value={mensaje} onChange={(event) => setMensaje(event.target.value)} />
          <div className="mb-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            Vista previa: {selectedClientes[0] ? personalize(mensaje, selectedClientes[0]) : mensaje.replace(/\{nombre\}/g, "Nombre")}
          </div>
          <button className="btn btn-primary w-full" disabled={!selected.length}><Send size={16} /> Enviar a {selected.length}</button>
          {status ? <div className="mt-3 text-sm text-slate-600">{status}</div> : null}
        </form>
      </div>
    </Layout>
  );
}
