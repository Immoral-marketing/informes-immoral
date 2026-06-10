"use server";

import { cookies } from "next/headers";

export async function logoutPortal(spaceSlug: string) {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: "portal_session",
    path: `/${spaceSlug}`,
  });
}
