-- 20260617000001_multitenant_v2_schema.sql

-- 3.1 Nueva tabla report_namespaces
CREATE TABLE report_namespaces (
  slug          text        PRIMARY KEY,
  entity_type   text        NOT NULL CHECK (entity_type IN ('client', 'vertical')),
  client_id     uuid        REFERENCES clients(id)   ON DELETE CASCADE,
  vertical_id   uuid        REFERENCES verticals(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_xor CHECK (
    (entity_type = 'client'   AND client_id IS NOT NULL   AND vertical_id IS NULL) OR
    (entity_type = 'vertical' AND vertical_id IS NOT NULL AND client_id IS NULL)
  )
);

CREATE UNIQUE INDEX rn_client_unique   ON report_namespaces(client_id)   WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX rn_vertical_unique ON report_namespaces(vertical_id) WHERE vertical_id IS NOT NULL;

-- 3.2 Modificaciones a clients
ALTER TABLE clients ADD COLUMN slug text;

-- 4. Migración de datos (Paso 1: Poblar clients.slug)
UPDATE clients c
SET slug = (
  WITH base AS (
    SELECT regexp_replace(
      lower(translate(name,
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
      )),
      '[^a-z0-9]+', '-', 'g'
    ) AS s
  )
  SELECT regexp_replace(trim(both '-' from s), '-+', '-', 'g') FROM base
)
WHERE slug IS NULL;

-- 4. Migración de datos (Paso 2: SET NOT NULL en clients.slug)
ALTER TABLE clients ALTER COLUMN slug SET NOT NULL;
ALTER TABLE clients ADD CONSTRAINT clients_slug_unique UNIQUE (slug);

-- 4. Migración de datos (Paso 3: Poblar report_namespaces para clientes)
INSERT INTO report_namespaces (slug, entity_type, client_id)
SELECT slug, 'client', id FROM clients
ON CONFLICT (slug) DO NOTHING;

-- 4. Migración de datos (Paso 4: Poblar report_namespaces para verticales)
INSERT INTO report_namespaces (slug, entity_type, vertical_id)
SELECT slug, 'vertical', id FROM verticals
ON CONFLICT (slug) DO NOTHING;

-- 3.3 Modificaciones a reports
ALTER TABLE reports ADD COLUMN namespace_slug text REFERENCES report_namespaces(slug) ON DELETE RESTRICT;
ALTER TABLE reports ADD COLUMN vertical_id    uuid REFERENCES verticals(id) ON DELETE SET NULL;
ALTER TABLE reports ALTER COLUMN pin_hash DROP NOT NULL;

CREATE UNIQUE INDEX reports_slug_per_namespace
  ON reports(namespace_slug, slug)
  WHERE namespace_slug IS NOT NULL;

-- 4. Migración de datos (Paso 5: Poblar reports.namespace_slug)
UPDATE reports r
SET namespace_slug = (
  SELECT c.slug
  FROM client_spaces cs
  JOIN clients c ON c.id = cs.client_id
  WHERE cs.id = r.space_id
);

-- 4. Migración de datos (Paso 6: Poblar reports.vertical_id)
UPDATE reports r
SET vertical_id = (
  SELECT cs.vertical_id
  FROM client_spaces cs
  WHERE cs.id = r.space_id
);

-- 3.4 Modificaciones a portal_sessions y space_access_tokens
ALTER TABLE portal_sessions
  ADD COLUMN namespace_slug text REFERENCES report_namespaces(slug) ON DELETE CASCADE;

ALTER TABLE space_access_tokens
  ADD COLUMN namespace_slug text REFERENCES report_namespaces(slug) ON DELETE CASCADE;

CREATE UNIQUE INDEX sat_namespace_recipient_unique
  ON space_access_tokens(namespace_slug, recipient_id)
  WHERE namespace_slug IS NOT NULL;

-- 4. Migración de datos (Paso 7: Migrar sesiones activas)
UPDATE portal_sessions ps
SET namespace_slug = (
  SELECT c.slug
  FROM client_spaces cs
  JOIN clients c ON c.id = cs.client_id
  WHERE cs.id = ps.space_id
)
WHERE ps.expires_at > now();

UPDATE space_access_tokens sat
SET namespace_slug = (
  SELECT c.slug
  FROM client_spaces cs
  JOIN clients c ON c.id = cs.client_id
  WHERE cs.id = sat.space_id
)
WHERE sat.consumed_at IS NULL AND sat.expires_at > now();

-- 5. RLS
ALTER TABLE report_namespaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rn_select_authenticated" ON report_namespaces
  FOR SELECT TO authenticated USING (true);

-- 4. Migración de datos (Paso 8: Verificar integridad)
DO $$
DECLARE
  v_reports_null_ns int;
  v_clients_null_slug int;
  v_clients_count int;
  v_rn_client_count int;
  v_verticals_count int;
  v_rn_vertical_count int;
BEGIN
  SELECT count(*) INTO v_reports_null_ns FROM reports WHERE namespace_slug IS NULL;
  IF v_reports_null_ns > 0 THEN
    RAISE EXCEPTION 'Integrity check failed: % reports have null namespace_slug', v_reports_null_ns;
  END IF;

  SELECT count(*) INTO v_clients_null_slug FROM clients WHERE slug IS NULL;
  IF v_clients_null_slug > 0 THEN
    RAISE EXCEPTION 'Integrity check failed: % clients have null slug', v_clients_null_slug;
  END IF;

  SELECT count(*) INTO v_clients_count FROM clients;
  SELECT count(*) INTO v_rn_client_count FROM report_namespaces WHERE entity_type = 'client';
  IF v_clients_count != v_rn_client_count THEN
    RAISE EXCEPTION 'Integrity check failed: clients count (%) does not match report_namespaces client count (%)', v_clients_count, v_rn_client_count;
  END IF;

  SELECT count(*) INTO v_verticals_count FROM verticals;
  SELECT count(*) INTO v_rn_vertical_count FROM report_namespaces WHERE entity_type = 'vertical';
  IF v_verticals_count != v_rn_vertical_count THEN
    RAISE EXCEPTION 'Integrity check failed: verticals count (%) does not match report_namespaces vertical count (%)', v_verticals_count, v_rn_vertical_count;
  END IF;
END $$;
