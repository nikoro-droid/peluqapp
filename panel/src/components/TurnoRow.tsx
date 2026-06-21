import { Trash2 } from "lucide-react";
import type { Turno } from "../types";

export default function TurnoRow({ turno, onCancel }: { turno: Turno; onCancel?: (id: number) => void }) {
  return (
    <tr>
      <td>{turno.hora}</td>
      <td>{turno.nombre_cliente}</td>
      <td>{turno.telefono_cliente}</td>
      <td>{turno.servicio_nombre ? `${turno.servicio_nombre} - $${turno.servicio_precio ?? 0}` : "-"}</td>
      <td>{turno.estado}</td>
      <td className="text-right">
        {onCancel && turno.estado !== "cancelado" ? (
          <button className="btn btn-muted" title="Cancelar turno" onClick={() => onCancel(turno.id)}>
            <Trash2 size={16} />
          </button>
        ) : null}
      </td>
    </tr>
  );
}
