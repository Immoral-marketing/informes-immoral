import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Admin client uses service_role key — bypasses RLS.
// Not typed with Database generic because our manual type doesn't match
// the exact format Supabase's TypeScript generics expect.
// Proper Supabase-generated types will replace this via `supabase gen types`.
let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set"
    );
  }
  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
