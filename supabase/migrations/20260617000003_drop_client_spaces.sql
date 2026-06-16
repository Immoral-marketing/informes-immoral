-- SPEC-36 Phase 4: Drop legacy space_id columns and client_spaces table
-- Verified columns: reports.space_id, portal_sessions.space_id, space_access_tokens.space_id
-- report_sessions does NOT have space_id (never did) — not included here

-- Replace reports_select RLS policy (old one references client_spaces + space_id)
DROP POLICY IF EXISTS "reports_select" ON "public"."reports";
CREATE POLICY "reports_select" ON "public"."reports"
  FOR SELECT USING (
    (created_by = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ))
    OR (EXISTS (
      SELECT 1 FROM report_namespaces rn
      JOIN clients c ON c.id = rn.client_id
      WHERE rn.slug = reports.namespace_slug
      AND c.created_by = auth.uid()
    ))
  );

ALTER TABLE "public"."reports" DROP COLUMN "space_id";
ALTER TABLE "public"."portal_sessions" DROP COLUMN "space_id";
ALTER TABLE "public"."space_access_tokens" DROP COLUMN "space_id";

DROP TABLE IF EXISTS "public"."client_spaces" CASCADE;
