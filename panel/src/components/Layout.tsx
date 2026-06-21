import { Bell, CreditCard, LayoutDashboard, LogOut, Scissors, Search, Settings, Store } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/negocios", label: "Peluquerias", icon: Store },
  { to: "/admin/suscripciones", label: "Contabilidad", icon: CreditCard }
];

function AdminLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
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
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} end={link.to === "/admin"} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50"}`}>
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

function NegocioLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#c4c7c7] bg-[#f9f9f9] px-4 md:px-10">
        <button className="flex items-center gap-3" onClick={() => navigate("/negocio")} title="Ir al panel">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-black text-sm font-black text-white">P</div>
          <div className="hidden text-left sm:block">
            <div className="text-xl font-bold text-black">PeluqApp</div>
            <div className="text-xs text-[#444748]">{session?.nombre}</div>
          </div>
        </button>
        <div className="hidden w-72 items-center rounded-full border border-[#c4c7c7] bg-white px-3 py-2 md:flex">
          <Search size={17} className="mr-2 text-[#747878]" />
          <input className="w-full border-none bg-transparent p-0 text-sm outline-none placeholder:text-[#747878] focus:ring-0" placeholder="Buscar cliente, turno..." />
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="grid h-10 w-10 place-items-center rounded-full text-[#444748] transition hover:bg-[#eeeeee]" title="Notificaciones">
            <Bell size={19} />
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-full text-[#444748] transition hover:bg-[#eeeeee]" onClick={() => navigate("/negocio/configuracion")} title="Configuracion">
            <Settings size={19} />
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-[#c4c7c7] bg-white text-[#444748] transition hover:bg-[#eeeeee]" onClick={() => { logout(); navigate("/login"); }} title="Cerrar sesion">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-24 md:px-10">{children}</main>
    </div>
  );
}

export default function Layout({ children, mode }: { children: ReactNode; mode: "admin" | "negocio" }) {
  return mode === "admin" ? <AdminLayout>{children}</AdminLayout> : <NegocioLayout>{children}</NegocioLayout>;
}
