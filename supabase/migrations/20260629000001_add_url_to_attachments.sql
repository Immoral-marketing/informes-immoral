-- Add url column to support URL-type attachments (SPEC: feat/download-and-url-attachments)
ALTER TABLE report_attachments ADD COLUMN IF NOT EXISTS url TEXT;
-- storage_path is now nullable: NULL for URL attachments, path string for file attachments
ALTER TABLE report_attachments ALTER COLUMN storage_path DROP NOT NULL;
