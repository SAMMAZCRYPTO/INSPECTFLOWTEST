-- Seed file for InspectFlow
-- This file is run after migrations to populate the database with initial test data

-- ============================================================================
-- ============================================================================
-- AUTO-CREATED ADMIN USER (saeed@inspectflow.com / test123)
-- ============================================================================
-- This script automatically creates the admin user after Database Reset
-- No manual signup required!

DO $$
DECLARE
  new_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'saeed@inspectflow.com') THEN
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'saeed@inspectflow.com',
      crypt('test123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"inspection_role": "admin", "full_name": "Saeed Admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      format('{"sub": "%s", "email": "saeed@inspectflow.com"}', new_user_id)::jsonb,
      'email',
      new_user_id,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ Auto-created Admin User: saeed@inspectflow.com / test123';
  END IF;

  -- 2. Create the Inspector User (ahmed@inspectflow.com / test123)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ahmed@inspectflow.com') THEN
    new_user_id := '00000000-0000-0000-0000-000000000002'; -- Fixed UUID for Inspector
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'ahmed@inspectflow.com',
      crypt('test123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"inspection_role": "inspector", "full_name": "Ahmed Inspector"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      format('{"sub": "%s", "email": "ahmed@inspectflow.com"}', new_user_id)::jsonb,
      'email',
      new_user_id,
      NOW(),
      NOW(),
      NOW()
    );

    -- Create Inspector profile linked to this auth user
    INSERT INTO inspectors (
      id,
      user_id,
      full_name,
      email,
      phone,
      specialization,
      company,
      status
    ) VALUES (
      '33333333-3333-3333-3333-333333333333',
      new_user_id,
      'Ahmed Inspector',
      'ahmed@inspectflow.com',
      '+971501234567',
      'Welding, Piping',
      'Global Inspection Services',
      'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET user_id = new_user_id;

    RAISE NOTICE '✅ Auto-created Inspector User: ahmed@inspectflow.com / test123';
  END IF;
END $$;

-- Insert sample TPI Agency
INSERT INTO tpi_agencies (id, name, company_code, manager_name, manager_email, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Global Inspection Services', 'GIS-001', 'John Manager', 'john@globalinspection.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample Project
INSERT INTO projects (id, name, code, description, client_name, status)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Sample Construction Project', 'PROJ-001', 'Sample project for testing', 'ABC Construction', 'active')
ON CONFLICT (id) DO NOTHING;
