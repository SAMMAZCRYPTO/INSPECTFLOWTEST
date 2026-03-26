-- Add address column to inspectors table

ALTER TABLE inspectors
ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN inspectors.address IS 'Inspector address or location';
