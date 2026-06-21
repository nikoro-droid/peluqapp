import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import AdminDashboard from "./pages/superadmin/Dashboard";
import Negocios from "./pages/superadmin/Negocios";
import NegocioDetalle from "./pages/superadmin/NegocioDetalle";
import Suscripciones from "./pages/superadmin/Suscripciones";
import NegocioDashboard from "./pages/negocio/Dashboard";
import Configuracion from "./pages/negocio/Configuracion";
import type { ReactElement } from "react";
import type { Rol } from "./types";

function Guard({ rol, children }: { rol: Rol; children: ReactElement }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.rol !== rol) return <Navigate to={session.rol === "superadmin" ? "/admin" : "/negocio"} replace />;
  return children;
}

function Router() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={session.rol === "superadmin" ? "/admin" : "/negocio"} replace /> : <Login />} />
      <Route path="/admin" element={<Guard rol="superadmin"><AdminDashboard /></Guard>} />
      <Route path="/admin/negocios" element={<Guard rol="superadmin"><Negocios /></Guard>} />
      <Route path="/admin/negocios/:id" element={<Guard rol="superadmin"><NegocioDetalle /></Guard>} />
      <Route path="/admin/suscripciones" element={<Guard rol="superadmin"><Suscripciones /></Guard>} />
      <Route path="/negocio" element={<Guard rol="negocio"><NegocioDashboard /></Guard>} />
      <Route path="/negocio/configuracion" element={<Guard rol="negocio"><Configuracion /></Guard>} />
      <Route path="/negocio/*" element={<Navigate to="/negocio" replace />} />
      <Route path="*" element={<Navigate to={session?.rol === "superadmin" ? "/admin" : session ? "/negocio" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><Router /></AuthProvider>;
}
