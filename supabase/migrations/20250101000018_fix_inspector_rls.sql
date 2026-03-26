-- UPDATED RLS policy for inspectors to verify by ID or EMAIL
-- Uses auth.jwt() to get email instead of querying auth.users to avoid permission denied errors

DROP POLICY IF EXISTS "Inspectors can view assigned inspections" ON inspections;
DROP POLICY IF EXISTS "Inspectors can update assigned inspections" ON inspections;

CREATE POLICY "Inspectors can view assigned inspections"
  ON inspections
  FOR SELECT
  TO authenticated
  USING (
    assigned_inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
    OR
    assigned_inspector_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY "Inspectors can update assigned inspections"
  ON inspections
  FOR UPDATE
  TO authenticated
  USING (
    assigned_inspector_id IN (
      SELECT id FROM inspectors WHERE user_id = auth.uid()
    )
    OR
    assigned_inspector_email = (auth.jwt() ->> 'email')
  );
