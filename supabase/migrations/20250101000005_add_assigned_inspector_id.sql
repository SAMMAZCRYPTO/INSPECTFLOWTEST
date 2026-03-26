-- Add assigned_inspector_id column to inspections table
-- This column stores the UUID of the assigned inspector

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS assigned_inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL;

COMMENT ON COLUMN inspections.assigned_inspector_id IS 'UUID of the assigned inspector (references inspectors table)';
