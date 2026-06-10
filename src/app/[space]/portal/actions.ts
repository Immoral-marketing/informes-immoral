"use server";

import { cookies } from "next/headers";

export async function logoutPortal(spaceSlug: string) {
  const cookieStore = await cookies();
  // Must match the exact attributes used when the cookie was set
  cookieStore.set("portal_session", "", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 0,
    path: `/${spaceSlug}`,
  });
}
