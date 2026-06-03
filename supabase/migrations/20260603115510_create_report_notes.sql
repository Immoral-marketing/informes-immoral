CREATE TYPE report_note_action AS ENUM ('created', 'updated', 'deleted', 'copied');

CREATE TABLE report_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_version_id uuid NOT NULL REFERENCES report_versions(id) ON DELETE CASCADE,
  dom_selector text NOT NULL,
  content text NOT NULL,
  is_orphan boolean NOT NULL DEFAULT false,
  copied_from_note_id uuid REFERENCES report_notes(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
CREATE INDEX idx_report_notes_version ON report_notes(report_version_id) WHERE deleted_at IS NULL;

CREATE TABLE report_note_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES report_notes(id) ON DELETE CASCADE,
  action report_note_action NOT NULL,
  previous_content text DEFAULT NULL,
  performed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  performed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_note_logs ENABLE ROW LEVEL SECURITY;

-- report_notes RLS
CREATE POLICY "Empleados y admins pueden leer notas de sus informes" ON report_notes
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM reports r
      JOIN report_versions rv ON r.id = rv.report_id
      WHERE rv.id = report_notes.report_version_id AND r.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Creadores de informe y admins pueden insertar notas" ON report_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN report_versions rv ON r.id = rv.report_id
      WHERE rv.id = report_version_id AND r.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solo autor puede actualizar su nota" ON report_notes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- report_note_logs RLS
CREATE POLICY "Lectura de logs igual que notas" ON report_note_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM report_notes n
      WHERE n.id = note_id AND (
        n.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM reports r
          JOIN report_versions rv ON r.id = rv.report_id
          WHERE rv.id = n.report_version_id AND r.created_by = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- No INSERT/UPDATE/DELETE policy for report_note_logs (append-only server-side)
