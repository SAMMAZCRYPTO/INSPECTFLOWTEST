-- Add missing company column to inspectors table
-- This field stores the inspector's company/TPI agency affiliation

ALTER TABLE inspectors
ADD COLUMN IF NOT EXISTS company TEXT;

COMMENT ON COLUMN inspectors.company IS 'Inspector company or TPI agency name';
