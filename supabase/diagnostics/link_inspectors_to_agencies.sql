-- ============================================================================
-- QUICK FIX: Link Inspectors to TPI Agencies
-- ============================================================================

-- Step 1: See current state (inspectors without agencies)
SELECT 
  id,
  full_name,
  email,
  tpi_agency_id,
  CASE 
    WHEN tpi_agency_id IS NULL THEN '❌ NOT LINKED'
    ELSE '✅ LINKED'
  END as status
FROM inspectors
ORDER BY tpi_agency_id NULLS FIRST;

-- Step 2: See available TPI agencies
SELECT 
  id,
  name,
  manager_name
FROM tpi_agencies
ORDER BY name;

-- ============================================================================
-- OPTION 1: Link ALL inspectors to the first TPI agency
-- ============================================================================
-- Use this if you have one main TPI agency
UPDATE inspectors 
SET tpi_agency_id = (SELECT id FROM tpi_agencies ORDER BY created_at LIMIT 1)
WHERE tpi_agency_id IS NULL;

-- ============================================================================
-- OPTION 2: Link specific inspectors to specific agencies
-- ============================================================================
-- Replace 'Inspector Name' and 'Agency Name' with actual values

-- Example: Link inspector Ahmed to "ABC Inspection Co"
UPDATE inspectors 
SET tpi_agency_id = (SELECT id FROM tpi_agencies WHERE name = 'ABC Inspection Co')
WHERE full_name = 'Ahmed Al-Mansouri';

-- Example: Link inspector John to "XYZ Quality Services"  
UPDATE inspectors 
SET tpi_agency_id = (SELECT id FROM tpi_agencies WHERE name = 'XYZ Quality Services')
WHERE email = 'john@example.com';

-- ============================================================================
-- OPTION 3: Link by inspector company field
-- ============================================================================
-- If inspector.company matches tpi_agency.name
UPDATE inspectors i
SET tpi_agency_id = a.id
FROM tpi_agencies a
WHERE i.company = a.name
  AND i.tpi_agency_id IS NULL;

-- ============================================================================
-- AFTER LINKING: Refresh the materialized view
-- ============================================================================
REFRESH MATERIALIZED VIEW CONCURRENTLY tpi_performance_dashboard;

-- ============================================================================
-- VERIFY: Check that inspectors are now linked
-- ============================================================================
SELECT 
  i.full_name as inspector,
  i.email,
  a.name as agency,
  COUNT(insp.id) as inspection_count
FROM inspectors i
LEFT JOIN tpi_agencies a ON i.tpi_agency_id = a.id
LEFT JOIN inspections insp ON insp.inspector_id = i.id
GROUP BY i.id, i.full_name, i.email, a.name
ORDER BY a.name, i.full_name;

-- Expected result:
-- inspector        | email                 | agency              | inspection_count
-- -----------------|----------------------|---------------------|------------------
-- Ahmed Al-Mansouri| ahmed@example.com    | ABC Inspection Co   | 5
-- John Smith       | john@example.com     | XYZ Quality Services| 3
