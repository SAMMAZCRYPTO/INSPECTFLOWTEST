-- Add all missing columns from the notification extraction schema
-- This migration adds all fields that the application expects but are missing from the database

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS all_inspection_dates TEXT,
ADD COLUMN IF NOT EXISTS notification_revision TEXT,
ADD COLUMN IF NOT EXISTS notification_receipt_date DATE,
ADD COLUMN IF NOT EXISTS subsupplier_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_contact_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS vendor_contact_email TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS inspection_time TEXT,
ADD COLUMN IF NOT EXISTS po_description TEXT,
ADD COLUMN IF NOT EXISTS inspection_type TEXT,
ADD COLUMN IF NOT EXISTS assigned_inspector_email TEXT,
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for clarity
COMMENT ON COLUMN inspections.all_inspection_dates IS 'All inspection dates extracted from notification document, stored as comma-separated or newline-separated values';
COMMENT ON COLUMN inspections.notification_revision IS 'Notification document revision/version (e.g., Rev 0, Rev A, V1.2)';
COMMENT ON COLUMN inspections.notification_receipt_date IS 'Date when the notification was received';
COMMENT ON COLUMN inspections.subsupplier_name IS 'Name of the manufacturer or sub-supplier';
COMMENT ON COLUMN inspections.vendor_contact_name IS 'Contact person name at vendor';
COMMENT ON COLUMN inspections.vendor_contact_phone IS 'Contact phone number';
COMMENT ON COLUMN inspections.vendor_contact_email IS 'Contact email address';
COMMENT ON COLUMN inspections.country IS 'Country where inspection takes place';
COMMENT ON COLUMN inspections.end_date IS 'Latest inspection date (if multiple dates exist)';
COMMENT ON COLUMN inspections.inspection_time IS 'Time of inspection (e.g., 10:00 AM)';
COMMENT ON COLUMN inspections.po_description IS 'Purchase Order description';
COMMENT ON COLUMN inspections.inspection_type IS 'Type of inspection (e.g., Pre-shipment, Final, Building)';
COMMENT ON COLUMN inspections.assigned_inspector_email IS 'Email of the assigned inspector';
COMMENT ON COLUMN inspections.requirements IS 'Requirements or checklist items for the inspection';
COMMENT ON COLUMN inspections.notes IS 'Additional notes or comments';
