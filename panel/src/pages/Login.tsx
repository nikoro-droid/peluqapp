import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors } from "lucide-react";
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
    <div className="grid min-h-screen place-items-center bg-panel px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-brand text-white">
            <Scissors size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">PeluqApp</h1>
            <p className="text-sm text-slate-500">Panel de gestion</p>
          </div>
        </div>
        <label className="mb-3 block text-sm font-medium">
          Email
          <input className="input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-medium">
          Contrasena
          <input className="input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <button className="btn btn-primary w-full">Ingresar</button>
      </form>
    </div>
  );
}
