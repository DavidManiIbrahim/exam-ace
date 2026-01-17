-- Optimization: Sync role into auth.users metadata for ultra-fast session loading
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  initial_role public.app_role;
BEGIN
  -- Get role from metadata or default to student
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
  );

  -- 2. Assign role in our table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, initial_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Optimization: Sync role back to auth.users app_metadata
  -- This allows us to access the role in the session WITHOUT a database query
  UPDATE auth.users 
  SET raw_app_metadata = raw_app_metadata || jsonb_build_object('role', initial_role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
