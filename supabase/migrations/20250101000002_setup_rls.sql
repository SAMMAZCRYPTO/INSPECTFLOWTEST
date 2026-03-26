-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- These policies control who can access what data based on their role
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tpi_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user role from auth.users metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'role',
    'inspector'  -- default role
  )::TEXT
  FROM auth.users
  WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- Admins and QC Managers: full access
CREATE POLICY "Admins and QC Managers can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'qc_manager'));

-- Inspection Engineers and Inspectors: read-only
CREATE POLICY "Engineers and Inspectors can view projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('inspection_engineer', 'inspector', 'tpi_manager'));

-- ============================================================================
-- TPI AGENCIES TABLE POLICIES
-- ============================================================================

-- Admins: full access
CREATE POLICY "Admins can manage TPI agencies"
  ON tpi_agencies
  FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin');

-- QC Managers and Engineers: read-only
CREATE POLICY "Managers and Engineers can view TPI agencies"
  ON tpi_agencies
  FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('qc_manager', 'inspection_engineer'));

-- TPI Managers: view their own agency
CREATE POLICY "TPI Managers can view their agency"
  ON tpi_agencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspectors
      WHERE inspectors.user_id = auth.uid()
      AND inspectors.tpi_agency_id = tpi_agencies.id
    )
  );

-- ============================================================================
-- INSPECTORS TABLE POLICIES
-- ============================================================================

-- Admins and QC Managers: full access
CREATE POLICY "Admins and QC Managers can manage inspectors"
  ON inspectors
  FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'qc_manager'));

-- Inspection Engineers: read-only
CREATE POLICY "Engineers can view inspectors"
  ON inspectors
  FOR SELECT
  TO authenticated
  USING (public.user_role() = 'inspection_engineer');

-- Inspectors: view and update their own profile
CREATE POLICY "Inspectors can view their profile"
  ON inspectors
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Inspectors can update their profile"
  ON inspectors
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- TPI Managers: view their agency's inspectors
CREATE POLICY "TPI Managers can view agency inspectors"
  ON inspectors
  FOR SELECT
  TO authenticated
  USING (
    tpi_agency_id IN (
      SELECT tpi_agency_id FROM inspectors
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- INSPECTIONS TABLE POLICIES
-- ============================================================================

-- Admins: full access
CREATE POLICY "Admins can manage all inspections"
  ON inspections
  FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin');

-- QC Managers: full access (can create, assign, update)
CREATE POLICY "QC Managers can manage inspections"
  ON inspections
  FOR ALL
  TO authenticated
  USING (public.user_role() = 'qc_manager');

-- Inspection Engineers: read all, update approval status
CREATE POLICY "Engineers can view all inspections"
  ON inspections
  FOR SELECT
  TO authenticated
  USING (public.user_role() = 'inspection_engineer');

CREATE POLICY "Engineers can update inspection reports"
  ON inspections
  FOR UPDATE
  TO authenticated
  USING (public.user_role() = 'inspection_engineer');

-- Inspectors: view assigned inspections, update reports
CREATE POLICY "Inspectors can view assigned inspections"
  ON inspections
  FOR SELECT
  TO authenticated
  USING (
    inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Inspectors can update assigned inspections"
  ON inspections
  FOR UPDATE
  TO authenticated
  USING (
    inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
  );

-- TPI Managers: view their agency's inspections
CREATE POLICY "TPI Managers can view agency inspections"
  ON inspections
  FOR SELECT
  TO authenticated
  USING (
    tpi_agency_id IN (
      SELECT tpi_agency_id FROM inspectors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- INSPECTION REVIEWS TABLE POLICIES
-- ============================================================================

-- Admins: full access
CREATE POLICY "Admins can manage reviews"
  ON inspection_reviews
  FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin');

-- QC Managers and Engineers: create/view reviews
CREATE POLICY "Managers and Engineers can create reviews"
  ON inspection_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_role() IN ('qc_manager', 'inspection_engineer'));

CREATE POLICY "Managers and Engineers can view reviews"
  ON inspection_reviews
  FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('qc_manager', 'inspection_engineer'));

-- Inspectors: view their own reviews (read-only)
CREATE POLICY "Inspectors can view their reviews"
  ON inspection_reviews
  FOR SELECT
  TO authenticated
  USING (
    inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- INSPECTION ATTENDANCE TABLE POLICIES
-- ============================================================================

-- Admins and QC Managers: full access
CREATE POLICY "Admins and Managers can view attendance"
  ON inspection_attendance
  FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('admin', 'qc_manager', 'inspection_engineer'));

-- Inspectors: create/view their own attendance records
CREATE POLICY "Inspectors can create attendance"
  ON inspection_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Inspectors can view their attendance"
  ON inspection_attendance
  FOR SELECT
  TO authenticated
  USING (
    inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Inspectors can update their attendance"
  ON inspection_attendance
  FOR UPDATE
  TO authenticated
  USING (
    inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
  );
