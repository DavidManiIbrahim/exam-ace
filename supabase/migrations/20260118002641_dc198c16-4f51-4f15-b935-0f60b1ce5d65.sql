-- Allow admins to view all user_roles for counting purposes
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users and admins can view roles"
ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'teacher')
);