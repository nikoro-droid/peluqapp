import { Bell, CalendarDays, CreditCard, LayoutDashboard, LogOut, Settings, Store } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/negocios", label: "Peluquerias", icon: Store },
  { to: "/admin/suscripciones", label: "Contabilidad", icon: CreditCard }
];

function TopShell({ children, mode }: { children: ReactNode; mode: "admin" | "negocio" }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = mode === "admin";
  const home = isAdmin ? "/admin" : "/negocio";
  const showMobileDock = !isAdmin;

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
      <header className={`fixed left-0 right-0 top-0 z-40 h-16 items-center justify-between border-b border-[#c4c7c7] bg-[#f9f9f9] px-4 md:px-10 ${showMobileDock ? "hidden md:flex" : "flex"}`}>
        <button className="flex items-center gap-3" onClick={() => navigate(home)} title="Ir al panel">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-black text-sm font-black text-white">P</div>
          <div className="hidden text-left sm:block">
            <div className="text-xl font-bold text-black">PeluqApp</div>
            <div className="text-xs text-[#444748]">{isAdmin ? "Administracion" : session?.nombre}</div>
          </div>
        </button>

        {isAdmin ? (
          <nav className="hidden items-center gap-2 rounded-full border border-[#c4c7c7] bg-white p-1 lg:flex">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink key={link.to} to={link.to} end={link.to === "/admin"} className={({ isActive }) => `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-black text-white" : "text-[#444748] hover:bg-[#eeeeee]"}`}>
                  <Icon size={16} /> {link.label}
                </NavLink>
              );
            })}
          </nav>
        ) : (
          <div className="hidden items-center gap-2 rounded-full border border-[#c4c7c7] bg-white p-1 lg:flex">
            <NavLink to="/negocio" end className={({ isActive }) => `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-black text-white" : "text-[#444748] hover:bg-[#eeeeee]"}`}>
              <LayoutDashboard size={16} /> Panel
            </NavLink>
            <NavLink to="/negocio/agenda" className={({ isActive }) => `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-black text-white" : "text-[#444748] hover:bg-[#eeeeee]"}`}>
              <CalendarDays size={16} /> Agenda
            </NavLink>
          </div>
        )}

        <div className="flex items-center gap-2 md:gap-3">
          <button className="grid h-10 w-10 place-items-center rounded-full text-[#444748] transition hover:bg-[#eeeeee]" title="Notificaciones">
            <Bell size={19} />
          </button>
          {!isAdmin ? (
            <button className="grid h-10 w-10 place-items-center rounded-full text-[#444748] transition hover:bg-[#eeeeee]" onClick={() => navigate("/negocio/configuracion")} title="Configuracion">
              <Settings size={19} />
            </button>
          ) : null}
          <button className="grid h-10 w-10 place-items-center rounded-full border border-[#c4c7c7] bg-white text-[#444748] transition hover:bg-[#eeeeee]" onClick={() => { logout(); navigate("/login"); }} title="Cerrar sesion">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className={`mx-auto w-full max-w-[1440px] px-4 md:px-10 ${showMobileDock ? "pb-28 pt-6 md:pb-10 md:pt-24" : "pb-10 pt-24"}`}>{children}</main>
      {showMobileDock ? (
        <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl md:hidden" aria-label="Navegacion principal">
          <NavLink to="/negocio" end className={({ isActive }) => `grid h-12 w-12 place-items-center rounded-full transition ${isActive ? "bg-black text-white shadow-md" : "text-[#444748] active:bg-[#eeeeee]"}`} title="Panel">
            <LayoutDashboard size={21} />
          </NavLink>
          <NavLink to="/negocio/agenda" className={({ isActive }) => `grid h-12 w-12 place-items-center rounded-full transition ${isActive ? "bg-black text-white shadow-md" : "text-[#444748] active:bg-[#eeeeee]"}`} title="Agenda">
            <CalendarDays size={21} />
          </NavLink>
          <NavLink to="/negocio/configuracion" className={({ isActive }) => `grid h-12 w-12 place-items-center rounded-full transition ${isActive ? "bg-black text-white shadow-md" : "text-[#444748] active:bg-[#eeeeee]"}`} title="Configuracion">
            <Settings size={21} />
          </NavLink>
          <button className="grid h-12 w-12 place-items-center rounded-full text-[#ba1a1a] transition active:bg-[#ffdad6]" onClick={() => { logout(); navigate("/login"); }} title="Cerrar sesion">
            <LogOut size={21} />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

export default function Layout({ children, mode }: { children: ReactNode; mode: "admin" | "negocio" }) {
  return <TopShell mode={mode}>{children}</TopShell>;
}
