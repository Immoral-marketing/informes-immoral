ALTER TABLE profiles ADD COLUMN personal_pin_hash text DEFAULT NULL;
COMMENT ON COLUMN profiles.personal_pin_hash IS 'Hash bcrypt del PIN personal de 4 dígitos del empleado (PIN maestro). NULL = sin configurar.';
