-- Drop and recreate RPC function with only existing columns
DROP FUNCTION IF EXISTS get_inspection_attendance(UUID);

CREATE OR REPLACE FUNCTION get_inspection_attendance(p_inspection_id UUID)
RETURNS TABLE (
  id UUID,
  inspection_id UUID,
  inspector_id UUID,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_coordinates_text TEXT,
  check_out_coordinates_text TEXT,
  location_verified BOOLEAN,
  check_in_notes TEXT,
  check_out_notes TEXT,
  created_at TIMESTAMPTZ,
  inspector_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ia.id,
    ia.inspection_id,
    ia.inspector_id,
    ia.check_in_time,
    ia.check_out_time,
    ST_AsText(ia.check_in_coordinates) as check_in_coordinates_text,
    ST_AsText(ia.check_out_coordinates) as check_out_coordinates_text,
    ia.location_verified,
    ia.check_in_notes,
    ia.check_out_notes,
    ia.created_at,
    i.full_name as inspector_name
  FROM inspection_attendance ia
  LEFT JOIN inspectors i ON ia.inspector_id = i.id
  WHERE ia.inspection_id = p_inspection_id
  ORDER BY ia.check_in_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_inspection_attendance(UUID) TO authenticated;
