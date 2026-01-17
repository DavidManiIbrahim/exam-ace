-- Ensure 'admin' role exists in the enum
-- We do this in a DO block to handle errors gracefully and ensure it's not in a failed state
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Fix the handle_new_user function
-- 1. Use explicit text cast for the enum to avoid issues with JSONB building
-- 2. Ensure the trigger is robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  initial_role public.app_role;
BEGIN
  -- Get role from metadata or default to student
  -- We cast to text first, then to app_role to be safe
  initial_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::public.app_role, 
    'student'::public.app_role
  );

  -- 1. Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  -- 2. Assign role in our table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, initial_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Optimization: Sync role back to auth.users app_metadata
  -- Use initial_role::text to ensure JSON compatibility
  -- Use a subquery to avoid some lock issues if any
  BEGIN
    UPDATE auth.users 
    SET raw_app_metadata = COALESCE(raw_app_metadata, '{}'::jsonb) || jsonb_build_object('role', initial_role::text)
    WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- If sync fails, don't block the whole signup
    -- We can still fetch the role from the database
    RAISE WARNING 'Could not sync role to app_metadata: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
