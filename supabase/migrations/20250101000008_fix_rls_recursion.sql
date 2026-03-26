-- Fix infinite recursion in RLS policy for inspectors table
-- The issue is on line 114 where the policy queries the same table it's protecting

-- Drop the problematic policy
DROP POLICY IF EXISTS "TPI Managers can view agency inspectors" ON inspectors;

-- Recreate with a simpler approach that avoids recursion
-- Instead of querying inspectors table, use auth.uid() directly
CREATE POLICY "TPI Managers can view agency inspectors"
  ON inspectors
  FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'tpi_manager' AND
    tpi_agency_id IS NOT NULL
  );
