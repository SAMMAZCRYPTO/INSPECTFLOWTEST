-- Add assigned_inspector_phone column to inspections table
-- This column stores the phone number of the assigned inspector

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS assigned_inspector_phone TEXT;

COMMENT ON COLUMN inspections.assigned_inspector_phone IS 'Phone number of the assigned inspector';
