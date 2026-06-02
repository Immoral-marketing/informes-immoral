import { nanoid } from "nanoid";

export function generateMagicLinkToken(): string {
  return nanoid(43);
}

export function generateSessionToken(): string {
  return nanoid(43);
}
