import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";

export async function hasValidPortalSession(spaceId: string) {
  const cookieStore = await cookies();
  const supabaseAdmin = createAdminClient();

  // 1. Try portal_session (space-scoped)
  const portalToken = cookieStore.get("portal_session")?.value;
  if (portalToken) {
    try {
      const portalHash = hashToken(portalToken);
      const { data } = await supabaseAdmin
        .from("portal_sessions")
        .select("expires_at")
        .eq("space_id", spaceId)
        .eq("session_token_hash", portalHash)
        .single();
      if (data && new Date(data.expires_at) > new Date()) return true;
    } catch { /* ignore */ }
  }

  // 2. Try informes_session — if the user authenticated via PIN or magic link for any report
  //    in this space, they should also have access to the portal
  const docToken = cookieStore.get("informes_session")?.value;
  if (docToken) {
    try {
      const docHash = hashToken(docToken);
      const { data } = await supabaseAdmin
        .from("report_sessions")
        .select("expires_at, reports!inner(space_id)")
        .eq("token_hash", docHash)
        .single();
      const session = data as unknown as { expires_at: string; reports: { space_id: string } } | null;
      if (session && session.reports?.space_id === spaceId && new Date(session.expires_at) > new Date()) {
        return true;
      }
    } catch { /* ignore */ }
  }

  return false;
}
