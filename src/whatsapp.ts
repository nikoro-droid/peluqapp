import type { IncomingMessage } from "./types";
import QRCode from "qrcode";

export interface EvolutionQrResponse {
  instance: string;
  state: string | null;
  connected: boolean;
  qr: string | null;
  pairingCode: string | null;
  count: number | null;
}

function evolutionConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!apiKey) throw new Error("EVOLUTION_API_KEY no configurada");
  if (process.env.RAILWAY_ENVIRONMENT && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(baseUrl)) {
    throw new Error("EVOLUTION_API_URL apunta a localhost dentro de Railway. Configura una URL publica de Evolution API o un servicio interno accesible.");
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

function findStringByKey(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const match = record[key];
    if (typeof match === "string" && match.trim()) return match;
  }
  for (const nested of Object.values(record)) {
    const match = findStringByKey(nested, keys);
    if (match) return match;
  }
  return null;
}

function findNumberByKey(value: unknown, keys: string[]): number | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const match = record[key];
    if (typeof match === "number") return match;
  }
  for (const nested of Object.values(record)) {
    const match = findNumberByKey(nested, keys);
    if (match !== null) return match;
  }
  return null;
}

function normalizeQrImage(value: string): string | null {
  const clean = value.trim();
  if (!clean) return null;
  if (clean.startsWith("data:image/")) return clean;
  if (/^[A-Za-z0-9+/=]+$/.test(clean) && clean.length > 300) return `data:image/png;base64,${clean}`;
  return null;
}

export function parseIncoming(payload: unknown): IncomingMessage | null {
  const root = payload as {
    event?: string;
    instance?: string;
    data?: {
      key?: { remoteJid?: string; fromMe?: boolean };
      message?: { conversation?: string; extendedTextMessage?: { text?: string } };
      messageType?: string;
    };
  };

  if (root.event && root.event !== "messages.upsert") return null;
  if (root.data?.key?.fromMe === true) return null;

  const instance = root.instance;
  const remoteJid = root.data?.key?.remoteJid;
  const body = root.data?.message?.conversation ?? root.data?.message?.extendedTextMessage?.text;
  if (!instance || !remoteJid || !body) return null;

  return {
    instance,
    from: remoteJid.endsWith("@s.whatsapp.net") ? remoteJid.replace(/@s\.whatsapp\.net$/, "") : remoteJid,
    body
  };
}

export async function sendMessage(instance: string, to: string, text: string): Promise<void> {
  const { baseUrl, apiKey } = evolutionConfig();

  const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ number: to, text })
  });
  if (!response.ok) throw new Error(`Evolution API error ${response.status}: ${await response.text()}`);
}

export async function getEvolutionConnectionState(instance: string): Promise<{ state: string | null; connected: boolean }> {
  const { baseUrl, apiKey } = evolutionConfig();
  const response = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
    headers: { apikey: apiKey }
  });
  if (!response.ok) return { state: null, connected: false };
  const payload = await response.json() as unknown;
  const state = findStringByKey(payload, ["state", "connectionState", "status"]);
  return { state, connected: state === "open" || state === "connected" };
}

export async function getEvolutionQr(instance: string): Promise<EvolutionQrResponse> {
  const { baseUrl, apiKey } = evolutionConfig();
  const state = await getEvolutionConnectionState(instance);
  if (state.connected) {
    return { instance, state: state.state, connected: true, qr: null, pairingCode: null, count: null };
  }

  const response = await fetch(`${baseUrl}/instance/connect/${encodeURIComponent(instance)}`, {
    headers: { apikey: apiKey }
  });
  if (!response.ok) throw new Error(`Evolution connect error ${response.status}: ${await response.text()}`);

  const payload = await response.json() as unknown;
  const pairingCode = findStringByKey(payload, ["pairingCode"]);
  const count = findNumberByKey(payload, ["count"]);
  const image = findStringByKey(payload, ["base64", "qrcode", "qr", "qrCode", "image"]);
  const qrImage = image ? normalizeQrImage(image) : null;
  const code = findStringByKey(payload, ["code"]);
  const qr = qrImage ?? (code ? await QRCode.toDataURL(code, { margin: 1, width: 256 }) : null);

  return { instance, state: state.state, connected: false, qr, pairingCode, count };
}
