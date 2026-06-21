export default function PlanBadge({ estado, plan }: { estado?: string | null; plan?: string | null }) {
  const active = estado === "activa";
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"}`}>
      {active ? plan ?? "Activo" : estado ?? "Sin plan"}
    </span>
  );
}
