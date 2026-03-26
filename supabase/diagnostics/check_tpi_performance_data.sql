-- ============================================================================
-- STEP-BY-STEP DIAGNOSTIC: Why TPI Performance Dashboard is Empty
-- ============================================================================

-- STEP 1: Check if TPI agencies exist
SELECT COUNT(*) as agency_count FROM tpi_agencies;
-- Expected: At least 1
-- If 0: You need to create TPI agencies in Admin > Agencies

-- STEP 2: Check if the view exists
SELECT COUNT(*) as view_exists 
FROM pg_matviews 
WHERE schemaname = 'public' AND matviewname = 'tpi_performance_dashboard';
-- Expected: 1
-- If 0: View doesn't exist, need to run migration

-- STEP 3: Check the actual data in the view
SELECT COUNT(*) as rows_in_view FROM tpi_performance_dashboard;
-- Expected: Same as agency_count
-- If 0: View is empty, needs refresh

-- STEP 4: Check what the view SHOULD show (bypassing the view)
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  COUNT(DISTINCT i.id) as total_inspections,
  COUNT(DISTINCT insp.id) filter (where insp.status = 'active') as active_inspectors,
  ROUND(AVG(r.overall_score), 1) as avg_overall_score
FROM tpi_agencies a
LEFT JOIN inspectors insp ON insp.tpi_agency_id = a.id
LEFT JOIN inspections i ON i.inspector_id = insp.id
LEFT JOIN inspection_reviews r ON r.inspection_id = i.id
GROUP BY a.id, a.name
ORDER BY a.name;
-- This shows what SHOULD be in the view

-- ============================================================================
-- COMMON ISSUES & FIXES
-- ============================================================================

-- ISSUE 1: View doesn't exist
-- FIX: Run the migration
-- npx supabase db reset

-- ISSUE 2: View exists but is empty
-- FIX: Refresh the view
-- REFRESH MATERIALIZED VIEW CONCURRENTLY tpi_performance_dashboard;

-- ISSUE 3: No agencies exist
-- FIX: Create a TPI agency
-- INSERT INTO tpi_agencies (name, manager_name, manager_email, status)
-- VALUES ('Sample TPI Agency', 'Manager Name', 'manager@example.com', 'active');

-- ISSUE 4: Agencies exist but no inspectors linked
-- FIX: This is likely the issue - run Step 4 query above to confirm
-- Then link inspectors via the Inspectors page UI OR run:
-- UPDATE inspectors 
-- SET tpi_agency_id = (SELECT id FROM tpi_agencies LIMIT 1)
-- WHERE tpi_agency_id IS NULL;

-- After ANY fix, always refresh:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY tpi_performance_dashboard;
