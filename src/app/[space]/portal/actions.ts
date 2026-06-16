"use server";

import { cookies } from "next/headers";

export async function logoutPortal(spaceSlug: string) {
  const cookieStore = await cookies();
  const secure = process.env["NODE_ENV"] === "production";

  // Clear portal_session (scoped to the space path)
  cookieStore.set("portal_session", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 0,
    path: `/${spaceSlug}`,
  });

  // Also clear informes_session — otherwise hasValidPortalSession keeps the
  // user authenticated via the document session and logout appears to do nothing
  cookieStore.set("informes_session", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
