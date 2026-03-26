-- ============================================================================
-- TPI PERFORMANCE DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to troubleshoot TPI Performance page issues
-- ============================================================================

-- Query 1: Check if TPI agencies exist
-- Expected: Should show at least 1 agency
SELECT 
  id,
  name,
  manager_name,
  status
FROM tpi_agencies
ORDER BY name;

-- Query 2: Check if materialized view exists and has data
-- Expected: Should show same number of rows as Query 1
SELECT 
  agency_id,
  agency_name,
  total_inspections,
  avg_overall_score,
  avg_quality_score,
  active_inspectors
FROM tpi_performance_dashboard
ORDER BY agency_name;

-- Query 3: Check the full data chain (Agency → Inspector → Inspection → Review)
-- Expected: Shows how many inspections and reviews each agency has
SELECT 
  a.name as agency_name,
  COUNT(DISTINCT insp.id) as num_inspectors,
  COUNT(DISTINCT i.id) as num_inspections,
  COUNT(DISTINCT r.id) as num_reviews,
  ROUND(AVG(r.overall_score), 1) as avg_score
FROM tpi_agencies a
LEFT JOIN inspectors insp ON insp.tpi_agency_id = a.id
LEFT JOIN inspections i ON i.inspector_id = insp.id  
LEFT JOIN inspection_reviews r ON r.inspection_id = i.id
GROUP BY a.id, a.name
ORDER BY a.name;

-- Query 4: Check if inspectors are linked to agencies
-- Expected: All inspectors should have a tpi_agency_id
SELECT 
  id,
  full_name,
  email,
  tpi_agency_id,
  status,
  CASE 
    WHEN tpi_agency_id IS NULL THEN '❌ NOT LINKED'
    ELSE '✅ LINKED'
  END as agency_link_status
FROM inspectors
ORDER BY tpi_agency_id NULLS FIRST;

-- Query 5: Check if inspections are linked to inspectors
-- Expected: All inspections should have an inspector_id
SELECT 
  i.notification_number,
  i.inspector_id,
  insp.full_name as inspector_name,
  insp.tpi_agency_id,
  a.name as agency_name,
  CASE 
    WHEN i.inspector_id IS NULL THEN '❌ NO INSPECTOR'
    WHEN insp.tpi_agency_id IS NULL THEN '⚠️ INSPECTOR NOT LINKED TO AGENCY'
    ELSE '✅ FULLY LINKED'
  END as link_status
FROM inspections i
LEFT JOIN inspectors insp ON i.inspector_id = insp.id
LEFT JOIN tpi_agencies a ON insp.tpi_agency_id = a.id
ORDER BY link_status, i.created_at DESC
LIMIT 20;

-- ============================================================================
-- FIXES (Run if issues found)
-- ============================================================================

-- Fix 1: If no agencies exist, create a sample one
-- INSERT INTO tpi_agencies (name, manager_name, manager_email, status)
-- VALUES ('Sample TPI Agency', 'John Manager', 'john@sample.com', 'active');

-- Fix 2: If materialized view is empty, refresh it
-- REFRESH MATERIALIZED VIEW CONCURRENTLY tpi_performance_dashboard;

-- Fix 3: If inspectors are not linked to agencies, link them
-- UPDATE inspectors 
-- SET tpi_agency_id = (SELECT id FROM tpi_agencies WHERE name = 'Sample TPI Agency')
-- WHERE tpi_agency_id IS NULL;

-- Fix 4: Check if view needs to be recreated (if schema changed)
-- DROP MATERIALIZED VIEW IF EXISTS tpi_performance_dashboard CASCADE;
-- Then re-run migration: npx supabase db reset

-- ============================================================================
-- EXPECTED RESULTS for working system:
-- ============================================================================
/*
Query 1: Should show agencies
+--------------------------------------+---------------------+--------------+--------+
| id                                   | name                | manager_name  | status |
+--------------------------------------+---------------------+--------------+--------+
| 123e4567-e89b-12d3-a456-426614174000 | ABC Inspection Co   | John Manager  | active |
+--------------------------------------+---------------------+--------------+--------+

Query 2: Should match Query 1 count  
+--------------------------------------+---------------------+-------------------+-------------------+
| agency_id                            | agency_name         | total_inspections | avg_overall_score |
+--------------------------------------+---------------------+-------------------+-------------------+
| 123e4567-e89b-12d3-a456-426614174000 | ABC Inspection Co   | 25                | 92.5              |
+--------------------------------------+---------------------+-------------------+-------------------+

Query 3: Should show inspection counts
+---------------------+----------------+------------------+-------------+------------+
| agency_name         | num_inspectors | num_inspections  | num_reviews | avg_score  |
+---------------------+----------------+------------------+-------------+------------+
| ABC Inspection Co   | 3              | 25               | 20          | 92.5       |
+---------------------+----------------+------------------+-------------+------------+
*/
