-- Fix the handle_new_user function to properly insert roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  initial_role text;
BEGIN
  -- Get role from metadata, default to 'student'
  initial_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
  
  -- Validate the role is one of the allowed values
  IF initial_role NOT IN ('student', 'teacher', 'admin') THEN
    initial_role := 'student';
  END IF;

  -- 1. Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Assign role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, initial_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Sync role back to auth.users app_metadata for faster RLS
  BEGIN
    UPDATE auth.users 
    SET raw_app_metadata = COALESCE(raw_app_metadata, '{}'::jsonb) || jsonb_build_object('role', initial_role)
    WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not sync role to app_metadata for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Add unique constraint on profiles.user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;