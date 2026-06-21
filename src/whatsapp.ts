import type { IncomingMessage } from "./types";

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
  const baseUrl = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!apiKey) throw new Error("EVOLUTION_API_KEY no configurada");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ number: to, text })
  });
  if (!response.ok) throw new Error(`Evolution API error ${response.status}: ${await response.text()}`);
}
