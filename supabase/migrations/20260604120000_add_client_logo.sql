ALTER TABLE clients ADD COLUMN logo_url text;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-logos', 'client-logos', false)
ON CONFLICT (id) DO NOTHING;
