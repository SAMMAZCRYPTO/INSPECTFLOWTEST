-- Add inspection_location column to inspections table
-- This column stores the inspection location details

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS inspection_location TEXT;

COMMENT ON COLUMN inspections.inspection_location IS 'Inspection location details';
