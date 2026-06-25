import type { Turno } from "../types";

export default function TurnoRow({ turno }: { turno: Turno }) {
  const estadoStyle: Record<string, string> = {
    confirmado: "bg-emerald-50 text-emerald-700",
    cancelado: "bg-[#ffdad6] text-[#ba1a1a]",
    pendiente: "bg-[#fed65b]/30 text-[#745c00]"
  };

  return (
    <tr className="hover:bg-[#f9f9f9]">
      <td className="px-4 py-3">{turno.fecha}</td>
      <td className="px-4 py-3 font-semibold">{turno.hora}</td>
      <td className="px-4 py-3">{turno.nombre_cliente}</td>
      <td className="px-4 py-3 text-[#444748]">{turno.servicio_nombre ?? "–"}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoStyle[turno.estado] ?? "bg-[#eeeeee] text-[#444748]"}`}>
          {turno.estado}
        </span>
      </td>
    </tr>
  );
}
