-- Add document_url column to inspections table
-- This column stores the URL of the uploaded notification document

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS document_url TEXT;

COMMENT ON COLUMN inspections.document_url IS 'URL of the uploaded notification document in Supabase storage';
