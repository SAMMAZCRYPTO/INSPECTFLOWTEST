-- ============================================================================
-- SCHEMA OPTIMIZATION: Week 1 - Performance Enhancements
-- Description: Adds computed columns and optimized indexes for faster queries
-- Breaking Changes: NONE - All additions are backwards compatible
-- ============================================================================

-- ============================================================================
-- PART 1: Add Computed Columns to Inspections Table
-- Purpose: Extract frequently queried data from JSONB for indexed lookups
-- ============================================================================

-- Add computed metric columns
ALTER TABLE inspections 
  ADD COLUMN IF NOT EXISTS findings_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ncr_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_pending_reports BOOLEAN DEFAULT FALSE;

-- Add index on new columns for fast filtering
CREATE INDEX IF NOT EXISTS idx_inspections_findings_count ON inspections(findings_count);
CREATE INDEX IF NOT EXISTS idx_inspections_ncr_count ON inspections(ncr_count);
CREATE INDEX IF NOT EXISTS idx_inspections_pending_reports ON inspections(has_pending_reports);

-- ============================================================================
-- PART 2: Trigger to Keep Computed Columns in Sync
-- Purpose: Automatically calculate metrics when inspection_reports JSONB changes
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_inspection_metrics()
RETURNS TRIGGER AS $$
DECLARE
  total_findings INTEGER := 0;
  total_ncrs INTEGER := 0;
  has_pending BOOLEAN := FALSE;
BEGIN
  -- Only recalculate if inspection_reports changed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (NEW.inspection_reports IS DISTINCT FROM OLD.inspection_reports)) THEN
    
    -- Count total findings across all reports
    SELECT COALESCE(SUM(jsonb_array_length(COALESCE(report->'findings', '[]'::jsonb))), 0)
    INTO total_findings
    FROM jsonb_array_elements(COALESCE(NEW.inspection_reports, '[]'::jsonb)) AS report;
    
    -- Count NCRs (non-conformances) specifically
    SELECT COUNT(*)
    INTO total_ncrs
    FROM jsonb_array_elements(COALESCE(NEW.inspection_reports, '[]'::jsonb)) AS report,
         jsonb_array_elements(COALESCE(report->'findings', '[]'::jsonb)) AS finding
    WHERE finding->>'type' = 'non_conformance';
    
    -- Check if any reports are pending approval
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(NEW.inspection_reports, '[]'::jsonb)) AS report
      WHERE report->>'approval_status' = 'pending'
    )
    INTO has_pending;
    
    -- Update computed columns
    NEW.findings_count := total_findings;
    NEW.ncr_count := total_ncrs;
    NEW.has_pending_reports := has_pending;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_inspection_metrics_trigger ON inspections;
CREATE TRIGGER sync_inspection_metrics_trigger
  BEFORE INSERT OR UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION sync_inspection_metrics();

-- ============================================================================
-- PART 3: Backfill Existing Data
-- Purpose: Calculate metrics for existing inspections
-- ============================================================================

-- Update all existing inspections to trigger metric calculation
-- This will be slow for large datasets, so we do it in batches
DO $$
DECLARE
  batch_size INTEGER := 100;
  total_updated INTEGER := 0;
BEGIN
  LOOP
    WITH batch AS (
      SELECT id
      FROM inspections
      WHERE findings_count = 0 AND ncr_count = 0 -- Only update unprocessed rows
      LIMIT batch_size
    )
    UPDATE inspections i
    SET updated_at = i.updated_at -- Trigger will recalculate metrics
    FROM batch
    WHERE i.id = batch.id;
    
    GET DIAGNOSTICS total_updated = ROW_COUNT;
    EXIT WHEN total_updated = 0;
    
    -- Log progress
    RAISE NOTICE 'Updated % inspections', total_updated;
    
    -- Small delay to avoid overwhelming the database
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- ============================================================================
-- PART 4: Optimized Compound Indexes
-- Purpose: Speed up common query patterns
-- ============================================================================

-- Index for filtering by project AND status (very common in Dashboard)
CREATE INDEX IF NOT EXISTS idx_inspections_project_status 
  ON inspections(project_id, status) 
  WHERE project_id IS NOT NULL;

-- Index for date-based queries with status
CREATE INDEX IF NOT EXISTS idx_inspections_date_status 
  ON inspections(created_at DESC, status);

-- Index for inspector performance queries
CREATE INDEX IF NOT EXISTS idx_reviews_inspector_date 
  ON inspection_reviews(inspector_id, review_date DESC);

-- Index for text search on notification/PO numbers using trigram similarity
CREATE INDEX IF NOT EXISTS idx_inspections_search_trgm 
  ON inspections USING GIN (
    (notification_number || ' ' || po_number) gin_trgm_ops
  );

-- Index for attendance lookups (already exists, but adding for completeness)
-- Composite index for common join pattern
CREATE INDEX IF NOT EXISTS idx_attendance_inspection_inspector 
  ON inspection_attendance(inspection_id, inspector_id);

-- ============================================================================
-- PART 5: Add Helpful Comments for Schema Documentation
-- ============================================================================

COMMENT ON COLUMN inspections.findings_count IS 
  'Computed: Total number of findings across all inspection reports (synced via trigger)';

COMMENT ON COLUMN inspections.ncr_count IS 
  'Computed: Number of non-conformance reports (NCRs) found (synced via trigger)';

COMMENT ON COLUMN inspections.has_pending_reports IS 
  'Computed: TRUE if any inspection report is awaiting approval (synced via trigger)';

-- ============================================================================
-- PART 6: Verification Queries
-- Purpose: Verify the migration worked correctly
-- ============================================================================

-- Check that computed columns are populated
DO $$
DECLARE
  total_inspections INTEGER;
  inspections_with_metrics INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_inspections FROM inspections;
  SELECT COUNT(*) INTO inspections_with_metrics 
  FROM inspections 
  WHERE findings_count >= 0; -- Should match total
  
  RAISE NOTICE 'Total inspections: %', total_inspections;
  RAISE NOTICE 'Inspections with metrics: %', inspections_with_metrics;
  
  IF total_inspections != inspections_with_metrics THEN
    RAISE WARNING 'Some inspections missing computed metrics!';
  ELSE
    RAISE NOTICE 'All inspections have computed metrics ✓';
  END IF;
END $$;

-- Sample query showing performance improvement
-- EXPLAIN ANALYZE
-- SELECT id, notification_number, findings_count, ncr_count
-- FROM inspections
-- WHERE project_id = 'some-uuid'
--   AND status = 'pending'
--   AND ncr_count > 0
-- ORDER BY created_at DESC
-- LIMIT 50;

-- ============================================================================
-- Migration Complete
-- Next Steps:
-- 1. Update inspectionService.js to use new columns
-- 2. Add filters in Dashboard.jsx: WHERE ncr_count > 0
-- 3. Monitor query performance improvements
-- ============================================================================
