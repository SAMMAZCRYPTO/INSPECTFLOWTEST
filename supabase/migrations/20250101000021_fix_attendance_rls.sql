-- Fix attendance RLS policies using auth.jwt() instead of auth.users
-- This avoids permission denied error when querying auth.users table

-- Drop existing inspector policies
DROP POLICY IF EXISTS "Inspectors can create attendance" ON inspection_attendance;
DROP POLICY IF EXISTS "Inspectors can view their attendance" ON inspection_attendance;
DROP POLICY IF EXISTS "Inspectors can update their attendance" ON inspection_attendance;

-- Recreate with auth.jwt() for email lookup
CREATE POLICY "Inspectors can create attendance"
  ON inspection_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inspector_id IN (
      SELECT id FROM inspectors 
      WHERE user_id = auth.uid() 
         OR email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Inspectors can view their attendance"
  ON inspection_attendance
  FOR SELECT
  TO authenticated
  USING (
    inspector_id IN (
      SELECT id FROM inspectors 
      WHERE user_id = auth.uid() 
         OR email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Inspectors can update their attendance"
  ON inspection_attendance
  FOR UPDATE
  TO authenticated
  USING (
    inspector_id IN (
      SELECT id FROM inspectors 
      WHERE user_id = auth.uid() 
         OR email = auth.jwt()->>'email'
    )
  );
