-- Fix user_role function to be secure and stable
-- SECURITY DEFINER functions should always set a search path to avoid privilege escalation
-- and ensure they work consistently regardless of who calls them.

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  role_text TEXT;
BEGIN
  SELECT COALESCE(
    raw_user_meta_data->>'inspection_role',
    raw_user_meta_data->>'role',
    'inspector'::text
  )
  INTO role_text
  FROM auth.users
  WHERE id = auth.uid();

  RETURN role_text;
END;
$$;

COMMENT ON FUNCTION public.user_role() IS 'Get user role preference from inspection_role then role metadata (Secure)';
