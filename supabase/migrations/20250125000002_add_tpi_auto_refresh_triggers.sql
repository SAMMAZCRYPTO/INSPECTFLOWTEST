-- ============================================================================
-- AUTO-REFRESH TRIGGERS for TPI Performance Dashboard
-- Automatically refresh the materialized view when data changes
-- ============================================================================

-- Create function to refresh the view
DROP FUNCTION IF EXISTS refresh_tpi_performance() CASCADE;
CREATE FUNCTION refresh_tpi_performance()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tpi_performance_dashboard;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on inspections table
DROP TRIGGER IF EXISTS auto_refresh_tpi_performance ON inspections;
CREATE TRIGGER auto_refresh_tpi_performance
  AFTER INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_tpi_performance();

-- Trigger on inspection_reviews table
DROP TRIGGER IF EXISTS auto_refresh_tpi_performance_reviews ON inspection_reviews;
CREATE TRIGGER auto_refresh_tpi_performance_reviews
  AFTER INSERT OR UPDATE OR DELETE ON inspection_reviews
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_tpi_performance();

-- Trigger on inspectors table (when linking to agency)
DROP TRIGGER IF EXISTS auto_refresh_tpi_performance_inspectors ON inspectors;
CREATE TRIGGER auto_refresh_tpi_performance_inspectors
  AFTER INSERT OR UPDATE OF tpi_agency_id OR DELETE ON inspectors
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_tpi_performance();

-- Trigger on tpi_agencies table
DROP TRIGGER IF EXISTS auto_refresh_tpi_performance_agencies ON tpi_agencies;
CREATE TRIGGER auto_refresh_tpi_performance_agencies
  AFTER INSERT OR UPDATE OR DELETE ON tpi_agencies
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_tpi_performance();

-- Test: Initial refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY tpi_performance_dashboard;

-- Verify triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%tpi_performance%'
ORDER BY event_object_table;
