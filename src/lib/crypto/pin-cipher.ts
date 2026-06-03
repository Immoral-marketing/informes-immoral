import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_B64 = process.env["PIN_ENCRYPTION_KEY"];

function getKey(): Buffer {
  if (!KEY_B64) {
    throw new Error("Missing PIN_ENCRYPTION_KEY environment variable. Must be 32 bytes in base64.");
  }
  const key = Buffer.from(KEY_B64, "base64");
  if (key.length !== 32) {
    throw new Error("PIN_ENCRYPTION_KEY must be exactly 32 bytes when decoded from base64.");
  }
  return key;
}

export function encryptPin(pin: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(pin, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

// Cifrado tolerante a fallos: si la clave falta o es inválida, no rompe el flujo
// (el PIN sigue siendo válido vía pin_hash; solo no se podrá "revelar" hasta regenerar).
export function safeEncryptPin(pin: string): string | null {
  try {
    return encryptPin(pin);
  } catch (e) {
    console.error("[pin-cipher] No se pudo cifrar el PIN:", (e as Error).message);
    return null;
  }
}

export function decryptPin(payload: string): string {
  const key = getKey();
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }
  const [ivB64, tagB64, encB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64!, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64!, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB64!, "base64")), decipher.final()]).toString("utf8");
}
