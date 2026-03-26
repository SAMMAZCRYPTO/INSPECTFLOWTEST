-- ============================================================================
-- AUTHENTICATION & AUTHORIZATION SETUP
-- Custom user roles and helper functions
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS SETUP
-- Create buckets for file uploads with proper access policies
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('inspection-documents', 'inspection-documents', true),
  ('inspector-cvs', 'inspector-cvs', true),
  ('avatars', 'avatars', true);

-- Storage policies for inspection-documents bucket
CREATE POLICY "Authenticated users can upload inspection documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-documents');

CREATE POLICY "Public can view inspection documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'inspection-documents');

CREATE POLICY "Admins and QC Managers can delete inspection documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inspection-documents' 
    AND public.user_role() IN ('admin', 'qc_manager')
  );

-- Storage policies for inspector-cvs bucket
CREATE POLICY "Inspectors can upload their CVs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspector-cvs');

CREATE POLICY "Authenticated users can view CVs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'inspector-cvs');

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload their avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Public can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

-- ============================================================================
-- HELPER FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to calculate distance between two geographic points (in meters)
CREATE OR REPLACE FUNCTION calculate_distance(
  point1 GEOGRAPHY,
  point2 GEOGRAPHY
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ST_Distance(point1, point2);
END;
$$ LANGUAGE plpgsql;

-- Function to verify if inspector is at inspection site (within tolerance)
CREATE OR REPLACE FUNCTION verify_location(
  inspection_id_param UUID,
  current_location GEOGRAPHY,
  tolerance_meters NUMERIC DEFAULT 500
)
RETURNS BOOLEAN AS $$
DECLARE
  site_location GEOGRAPHY;
  distance NUMERIC;
BEGIN
  -- Get inspection site coordinates
  SELECT location_coordinates INTO site_location
  FROM inspections
  WHERE id = inspection_id_param;
  
  IF site_location IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate distance
  distance := ST_Distance(site_location, current_location);
  
  -- Return true if within tolerance
  RETURN distance <= tolerance_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update inspection status based on reports
CREATE OR REPLACE FUNCTION auto_update_inspection_status()
RETURNS TRIGGER AS $$
DECLARE
  has_final_report BOOLEAN;
  has_release_note BOOLEAN;
BEGIN
  -- Check if final report exists in inspection_reports JSONB array
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.inspection_reports) AS report
    WHERE report->>'type' = 'final'
    AND report->>'approval_status' = 'approved'
  ) INTO has_final_report;
  
  -- Check if release note URL is present
  has_release_note := NEW.release_note_url IS NOT NULL AND NEW.release_note_url != '';
  
  -- Auto-finalize if both conditions met
  IF has_final_report AND has_release_note AND NEW.status != 'finalized' THEN
    NEW.status := 'completed';  -- Can be manually finalized by QC Manager
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to inspections table
CREATE TRIGGER check_inspection_status_auto_update
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_inspection_status();

-- ============================================================================
-- KPI CALCULATION FUNCTIONS
-- Functions to calculate inspector and TPI agency performance metrics
-- ============================================================================

-- Calculate inspector average score
CREATE OR REPLACE FUNCTION get_inspector_avg_score(inspector_id_param UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(AVG(overall_score), 0)
  FROM inspection_reviews
  WHERE inspector_id = inspector_id_param;
$$ LANGUAGE SQL;

-- Calculate inspector on-time submission rate
CREATE OR REPLACE FUNCTION get_inspector_ontime_rate(inspector_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_inspections INTEGER;
  ontime_inspections INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_inspections
  FROM inspections
  WHERE inspector_id = inspector_id_param
  AND status IN ('completed', 'finalized');
  
  IF total_inspections = 0 THEN
    RETURN 100.0;
  END IF;
  
  SELECT COUNT(*) INTO ontime_inspections
  FROM inspections
  WHERE inspector_id = inspector_id_param
  AND status IN ('completed', 'finalized')
  AND actual_completion_date <= expected_completion_date;
  
  RETURN (ontime_inspections::NUMERIC / total_inspections::NUMERIC) * 100;
END;
$$ LANGUAGE plpgsql;

-- Calculate TPI agency average performance
CREATE OR REPLACE FUNCTION get_tpi_agency_avg_score(agency_id_param UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(AVG(ir.overall_score), 0)
  FROM inspection_reviews ir
  JOIN inspectors i ON ir.inspector_id = i.id
  WHERE i.tpi_agency_id = agency_id_param;
$$ LANGUAGE SQL;

-- ============================================================================
-- SEED DATA FOR TESTING (Optional - remove in production)
-- ============================================================================

-- Insert a default admin user role in auth.users metadata
-- This would typically be done through your application's signup flow
-- For now, this is a placeholder comment - actual user creation happens through Supabase Auth
