import { createHmac } from "crypto";

export function hashToken(token: string): string {
  const secret = process.env["SESSION_TOKEN_HASH_SECRET"];
  if (!secret) {
    throw new Error("SESSION_TOKEN_HASH_SECRET is not set");
  }
  return createHmac("sha256", secret).update(token).digest("hex");
}
