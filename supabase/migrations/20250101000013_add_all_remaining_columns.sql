-- FINAL COMPREHENSIVE MIGRATION
-- Add ALL remaining missing columns to inspectors and tpi_agencies tables

-- ============================================================================
-- TPI AGENCIES TABLE - Add missing columns
-- ============================================================================
ALTER TABLE tpi_agencies
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN tpi_agencies.email IS 'Main agency email address';
COMMENT ON COLUMN tpi_agencies.phone IS 'Main agency phone number';

-- ============================================================================
-- INSPECTORS TABLE - Add missing columns
-- ============================================================================
ALTER TABLE inspectors
ADD COLUMN IF NOT EXISTS certification_number TEXT,
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS qualification_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_invited BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN inspectors.certification_number IS 'Inspector certification/license number';
COMMENT ON COLUMN inspectors.years_of_experience IS 'Years of professional experience';
COMMENT ON COLUMN inspectors.qualification_url IS 'URL to uploaded qualification/certificate document';
COMMENT ON COLUMN inspectors.notes IS 'Additional notes about the inspector';
COMMENT ON COLUMN inspectors.is_invited IS 'Whether the inspector has been invited to the system';
