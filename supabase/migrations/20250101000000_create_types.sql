-- Create custom enum types for the application
-- These enums ensure data consistency and provide clear status/type values

-- Inspection status workflow
CREATE TYPE inspection_status AS ENUM (
  'received',
  'scheduled',
  'in_progress',
  'completed',
  'finalized'
);

-- Inspector availability status
CREATE TYPE inspector_status AS ENUM (
  'active',
  'inactive',
  'suspended'
);

-- Report types for inspections
CREATE TYPE report_type AS ENUM (
  'flash',
  'interim',
  'final'
);

-- Finding types from inspection reports
CREATE TYPE finding_type AS ENUM (
  'non_conformance',
  'observation',
  'recommendation'
);

-- Approval status for reports and findings
CREATE TYPE approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);
