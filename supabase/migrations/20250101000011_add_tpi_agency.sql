-- COMPREHENSIVE FINAL MIGRATION
-- Add ALL remaining missing columns to inspections table

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS tpi_agency TEXT;

COMMENT ON COLUMN inspections.tpi_agency IS 'Name of the assigned TPI (Third Party Inspection) agency';
