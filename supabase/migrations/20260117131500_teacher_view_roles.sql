-- Allow teachers to view student roles so they can count students and view student lists
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'teacher')
);
