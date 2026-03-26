-- Add assigned_inspector_name column to inspections table
-- This column stores the name of the assigned inspector (denormalized for quick display)

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS assigned_inspector_name TEXT;

COMMENT ON COLUMN inspections.assigned_inspector_name IS 'Name of the assigned inspector (denormalized for quick display)';
