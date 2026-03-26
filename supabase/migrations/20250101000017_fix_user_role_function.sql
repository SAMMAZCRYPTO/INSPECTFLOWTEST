-- Fix RLS user_role function to check inspection_role first
-- The user_role() function was only checking checks 'role' metadata, but the app uses 'inspection_role'
-- This caused admins (who had inspection_role='admin' but role='inspector') to be denied access

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'inspection_role',
    raw_user_meta_data->>'role',
    'inspector'  -- default role
  )::TEXT
  FROM auth.users
  WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION public.user_role() IS 'Get user role preference from inspection_role then role metadata';
