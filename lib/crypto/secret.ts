import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function encryptionKey() {
  const secret =
    process.env.SYNAPSE_APP_SECRET ?? process.env.OPENAI_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Falta SYNAPSE_APP_SECRET (mínimo 32 caracteres)");
  }
  return scryptSync(secret, "synapse-openai-key-v1", 32);
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string) {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 29) throw new Error("Payload cifrado inválido");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function last4OfKey(key: string) {
  return key.trim().slice(-4);
}

export function assertApiKeyFormat(key: string) {
  const trimmed = key.trim();
  if (trimmed.includes(" ") || trimmed.includes("\n")) {
    throw new Error("La clave no debe contener espacios");
  }
  if (trimmed.length < 12 || trimmed.length > 400) {
    throw new Error("Esa clave no tiene un formato válido");
  }
}

export function assertHttpsApiUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("La URL del proveedor no es válida");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("La URL debe ser https");
  }
  if (url.username || url.password) {
    throw new Error("La URL no debe llevar usuario ni contraseña");
  }
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}
