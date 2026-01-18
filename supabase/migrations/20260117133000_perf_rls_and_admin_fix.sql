-- 1. Safely add 'admin' role to the enum
-- In Supabase/Postgres, we can't always do this in a transaction.
-- But we can try to ensure it exists.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Create a very safe helper function for RLS that avoids recursion
-- This uses the JWT metadata we synced in the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;

-- 3. Update User Roles RLS to be much simpler and avoid recursion
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;

CREATE POLICY "Allow authenticated to view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')
);

CREATE POLICY "Allow individual insert during signup"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Update Profiles RLS to use the faster metadata check
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

CREATE POLICY "Teachers and Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'teacher')
);

-- 5. Fix the handle_new_user trigger once and for all
-- We'll use a more surgical approach to updating auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  initial_role text;
BEGIN
  -- Get role from metadata as text first
  initial_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');

  -- 1. Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Assign role in our table
  -- Note: We cast text to app_role here
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, initial_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Sync role back to auth.users app_metadata for RLS performance
  -- We do this as a background-ish update to avoid transaction issues
  -- but since it's after insert it should be fine.
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

-- 6. One-time sync for existing users to ensure RLS works immediately
UPDATE auth.users u
SET raw_app_metadata = COALESCE(raw_app_metadata, '{}'::jsonb) || jsonb_build_object('role', r.role::text)
FROM public.user_roles r
WHERE u.id = r.user_id;
