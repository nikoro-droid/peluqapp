import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, Scissors } from "lucide-react";
import { API_BASE_URL } from "../config";
import { useAuth } from "../hooks/useAuth";
import type { Session } from "../types";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      setError("Credenciales invalidas");
      return;
    }
    const session = (await response.json()) as Session;
    login(session);
    navigate(session.rol === "superadmin" ? "/admin" : "/negocio", { replace: true });
  }

  return (
    <main className="grid min-h-screen bg-[#f9f9f9] text-[#1a1c1c] lg:grid-cols-[1fr_480px]">
      <section className="hidden flex-col justify-between border-r border-[#c4c7c7] bg-white p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-black text-white"><Scissors size={20} /></div>
          <div>
            <h1 className="text-2xl font-bold text-black">PeluqApp</h1>
            <p className="text-sm text-[#444748]">Panel para peluquerias con agente de WhatsApp</p>
          </div>
        </div>
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase text-[#747878]">Gestion centralizada</p>
          <h2 className="text-5xl font-bold leading-tight text-black">Agenda, mensajes y configuracion del agente en una sola vista.</h2>
          <p className="mt-5 max-w-xl text-lg text-[#444748]">Entra al panel general para ver turnos, conversaciones, retencion y el estado de tu negocio. La configuracion vive en el engranaje superior.</p>
        </div>
        <div className="grid max-w-xl grid-cols-3 gap-3">
          <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="text-xs uppercase text-[#747878]">Vista</div><div className="mt-2 font-semibold">Panel general</div></div>
          <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="text-xs uppercase text-[#747878]">Acceso</div><div className="mt-2 font-semibold">Configuracion</div></div>
          <div className="rounded-lg border border-[#c4c7c7] bg-[#f9f9f9] p-4"><div className="text-xs uppercase text-[#747878]">WhatsApp</div><div className="mt-2 font-semibold">Evolution API</div></div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-[#c4c7c7] bg-white p-6 shadow-sm">
          <div className="mb-7">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-black text-white"><LockKeyhole size={20} /></div>
            <h2 className="text-2xl font-semibold text-black">Ingresar</h2>
            <p className="mt-1 text-sm text-[#444748]">Accede a tu panel de gestion.</p>
          </div>
          <label className="mb-4 block text-sm font-medium text-[#444748]">
            Email
            <input className="input mt-1 border-[#c4c7c7] bg-[#f9f9f9]" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label className="mb-5 block text-sm font-medium text-[#444748]">
            Contrasena
            <input className="input mt-1 border-[#c4c7c7] bg-[#f9f9f9]" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          {error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#474746]">
            Entrar al panel <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
