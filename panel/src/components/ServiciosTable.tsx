import { FormEvent, useEffect, useState } from "react";
import { Edit2, GripVertical, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useApi } from "../hooks/useApi";
import type { Servicio } from "../types";

interface Props {
  endpoint: string;
  onChange?: (servicios: Servicio[]) => void;
}

type ServicioForm = Pick<Servicio, "nombre" | "duracion_min" | "precio"> & { id?: number };

export default function ServiciosTable({ endpoint, onChange }: Props) {
  const api = useApi();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [modal, setModal] = useState<ServicioForm | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const load = () => {
    void api<Servicio[]>(endpoint)
      .then((items) => {
        setServicios(items);
        onChange?.(items);
      })
      .catch(console.error);
  };

  useEffect(load, [api, endpoint]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      nombre: String(data.nombre),
      duracion_min: Number(data.duracion_min),
      precio: Number(data.precio)
    };
    if (modal.id) {
      await api(`${endpoint}/${modal.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
    }
    setModal(null);
    load();
  }

  async function toggle(servicio: Servicio) {
    await api(`${endpoint}/${servicio.id}`, { method: "PATCH", body: JSON.stringify({ activo: servicio.activo ? 0 : 1 }) });
    load();
  }

  async function reorder(targetId: number) {
    if (!draggedId || draggedId === targetId) return;
    const current = [...servicios];
    const from = current.findIndex((servicio) => servicio.id === draggedId);
    const to = current.findIndex((servicio) => servicio.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setServicios(current);
    onChange?.(current);
    setDraggedId(null);
    await Promise.all(current.map((servicio, index) => api(`${endpoint}/${servicio.id}`, { method: "PATCH", body: JSON.stringify({ orden: index }) })));
    load();
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Trabajos aceptados</h2>
        <button className="btn btn-primary" onClick={() => setModal({ nombre: "", duracion_min: 30, precio: 0 })}>
          <Plus size={16} /> Nuevo trabajo
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="table w-full">
          <thead>
            <tr><th></th><th>Trabajo</th><th>Duracion</th><th>Precio</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {servicios.map((servicio) => (
              <tr
                key={servicio.id}
                draggable
                onDragStart={() => setDraggedId(servicio.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void reorder(servicio.id)}
                className={servicio.activo ? "" : "bg-slate-50 text-slate-400"}
              >
                <td className="w-8 text-slate-400"><GripVertical size={16} /></td>
                <td>{servicio.nombre}</td>
                <td>{servicio.duracion_min} min</td>
                <td>${servicio.precio}</td>
                <td>{servicio.activo ? "Activo" : "Inactivo"}</td>
                <td className="flex justify-end gap-2">
                  <button className="btn btn-muted" title="Editar trabajo" onClick={() => setModal(servicio)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn btn-muted" title={servicio.activo ? "Desactivar" : "Activar"} onClick={() => toggle(servicio)}>
                    {servicio.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </td>
              </tr>
            ))}
            {!servicios.length ? <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay trabajos cargados</td></tr> : null}
          </tbody>
        </table>
      </div>
      {modal ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/30 p-4">
          <form onSubmit={save} className="grid w-full max-w-md gap-3 rounded-lg bg-white p-5">
            <h2 className="font-semibold">{modal.id ? "Editar trabajo" : "Nuevo trabajo"}</h2>
            <input className="input" name="nombre" placeholder="Nombre" defaultValue={modal.nombre} required />
            <input className="input" name="duracion_min" type="number" min={1} placeholder="Duracion en minutos" defaultValue={modal.duracion_min} required />
            <input className="input" name="precio" type="number" min={0} step="0.01" placeholder="Precio" defaultValue={modal.precio} required />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-muted" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}