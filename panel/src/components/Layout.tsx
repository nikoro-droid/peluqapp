import { Bot, CalendarDays, CreditCard, LayoutDashboard, LogOut, Megaphone, Scissors, Settings, Store } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/negocios", label: "Peluquerias", icon: Store },
  { to: "/admin/suscripciones", label: "Contabilidad", icon: CreditCard }
];

const negocioLinks = [
  { to: "/negocio", label: "Dashboard", icon: LayoutDashboard },
  { to: "/negocio/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/negocio/bot-respuestas", label: "Bot de respuestas", icon: Bot },
  { to: "/negocio/marketing", label: "Marketing", icon: Megaphone },
  { to: "/negocio/configuracion", label: "Configuracion", icon: Settings },
  { to: "/negocio/suscripcion", label: "Mi Plan", icon: CreditCard }
];

export default function Layout({ children, mode }: { children: ReactNode; mode: "admin" | "negocio" }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const links = mode === "admin" ? adminLinks : negocioLinks;
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-r border-line bg-white md:w-64">
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-brand text-white">
            <Scissors size={18} />
          </div>
          <div className="font-semibold">PeluqApp</div>
        </div>
        <nav className="p-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} end={link.to === "/admin" || link.to === "/negocio"} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={17} /> {link.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-line bg-white px-6">
          <div className="font-medium">{session?.nombre}</div>
          <button className="btn btn-muted" onClick={() => { logout(); navigate("/login"); }} title="Cerrar sesion">
            <LogOut size={16} />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
