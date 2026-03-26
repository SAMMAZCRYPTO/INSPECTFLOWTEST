-- Add RPC functions to support User Management
-- These functions allow fetching and updating auth.users from the application

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  inspection_role TEXT,
  company_affiliation TEXT,
  phone TEXT,
  department TEXT,
  project_ids JSONB,
  user_status TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    (u.raw_user_meta_data->>'full_name')::TEXT as full_name,
    (u.raw_user_meta_data->>'role')::TEXT as role,
    (u.raw_user_meta_data->>'inspection_role')::TEXT as inspection_role,
    (u.raw_user_meta_data->>'company_affiliation')::TEXT as company_affiliation,
    (u.raw_user_meta_data->>'phone')::TEXT as phone,
    (u.raw_user_meta_data->>'department')::TEXT as department,
    (u.raw_user_meta_data->'project_ids')::JSONB as project_ids,
    (u.raw_user_meta_data->>'user_status')::TEXT as user_status,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to update user metadata
CREATE OR REPLACE FUNCTION update_user_metadata(
  user_id UUID,
  metadata JSONB
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  updated_metadata JSONB;
BEGIN
  -- Merge new metadata with existing
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || metadata
  WHERE id = user_id
  RETURNING raw_user_meta_data INTO updated_metadata;
  
  RETURN updated_metadata;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_metadata(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION get_all_users IS 'Fetch all users with their metadata for User Management';
COMMENT ON FUNCTION update_user_metadata IS 'Update user metadata for role assignment';
