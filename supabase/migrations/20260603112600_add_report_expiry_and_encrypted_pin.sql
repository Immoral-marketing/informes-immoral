ALTER TABLE reports ADD COLUMN expiry_date timestamptz DEFAULT NULL;
ALTER TABLE reports ADD COLUMN pin_encrypted text DEFAULT NULL;

COMMENT ON COLUMN reports.expiry_date IS 'Fecha de vigencia del informe (caducidad lógica). NULL = sin caducidad.';
COMMENT ON COLUMN reports.pin_encrypted IS 'PIN cifrado reversible (AES-256-GCM) para que el empleado pueda visualizarlo. El hash bcrypt en pin_hash sigue siendo la fuente de verdad para validar.';
