-- Allow inspectors to view their own profile by email in addition to user_id
-- This acts as a fallback if user_id linking is broken or inconsistent

CREATE POLICY "Inspectors can view their profile by email"
  ON inspectors
  FOR SELECT
  TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
  );
