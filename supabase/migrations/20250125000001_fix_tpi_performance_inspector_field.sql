-- ============================================================================
-- FIX: Update TPI Performance Dashboard to use assigned_inspector_id
-- The view was using inspector_id (NULL) instead of assigned_inspector_id
-- ============================================================================

-- Drop the old view
DROP MATERIALIZED VIEW IF EXISTS tpi_performance_dashboard CASCADE;

-- Recreate with correct field
CREATE MATERIALIZED VIEW tpi_performance_dashboard AS
SELECT 
  -- Agency Information
  a.id as agency_id,
  a.name as agency_name,
  a.company_code,
  a.manager_name,
  a.manager_email,
  a.status as agency_status,
  
  -- Inspection Metrics (FIXED: using assigned_inspector_id)
  COUNT(DISTINCT i.id) as total_inspections,
  COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_inspections,
  COUNT(DISTINCT CASE WHEN i.status = 'received' THEN i.id END) as received_inspections,
  COUNT(DISTINCT CASE WHEN i.status = 'in_progress' THEN i.id END) as in_progress_inspections,
  COUNT(DISTINCT CASE WHEN i.status = 'scheduled' THEN i.id END) as scheduled_inspections,
  
  -- Quality Metrics from Reviews
  ROUND(AVG(r.overall_score), 1) as avg_overall_score,
  ROUND(AVG(r.report_quality_score), 1) as avg_quality_score,
  ROUND(AVG(r.timeliness_score), 1) as avg_timeliness_score,
  ROUND(AVG(r.communication_score), 1) as avg_communication_score,
  
  -- Inspector Count
  COUNT(DISTINCT insp.id) FILTER (WHERE insp.status = 'active') as active_inspectors,
  COUNT(DISTINCT insp.id) as total_inspectors,
  
  -- Timeliness Metrics
  ROUND(
    COUNT(CASE WHEN i.actual_completion_date <= i.expected_completion_date THEN 1 END)::NUMERIC 
    / NULLIF(COUNT(CASE WHEN i.actual_completion_date IS NOT NULL THEN 1 END), 0) * 100, 
    1
  ) as on_time_completion_rate,
  
  -- NCR Metrics (using new computed columns)
  SUM(COALESCE(i.ncr_count, 0)) as total_ncrs,
  SUM(COALESCE(i.findings_count, 0)) as total_findings,
  
  -- Review Quality Metrics
  SUM(COALESCE(r.missed_ncr_count, 0)) as total_missed_ncrs,
  SUM(COALESCE(r.false_ncr_count, 0)) as total_false_ncrs,
  
  -- Last Update Timestamp
  MAX(i.updated_at) as last_inspection_update,
  NOW() as view_refreshed_at
  
FROM tpi_agencies a
LEFT JOIN inspectors insp ON insp.tpi_agency_id = a.id
LEFT JOIN inspections i ON i.assigned_inspector_id = insp.id  -- FIXED: was inspector_id
LEFT JOIN inspection_reviews r ON r.inspection_id = i.id
GROUP BY a.id, a.name, a.company_code, a.manager_name, a.manager_email, a.status;

-- Create indexes
CREATE UNIQUE INDEX idx_tpi_perf_agency_id ON tpi_performance_dashboard(agency_id);
CREATE INDEX idx_tpi_perf_agency_name ON tpi_performance_dashboard(agency_name);
CREATE INDEX idx_tpi_perf_status ON tpi_performance_dashboard(agency_status);

-- Verify
SELECT 
  agency_name,
  total_inspections,
  active_inspectors,
  avg_overall_score
FROM tpi_performance_dashboard
ORDER BY agency_name;
