-- Update user_roles policies to allow admins to manage roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;

-- Allow users to view their own role, admins can view all
CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can insert their own role during signup
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can update any role
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles policies to allow admin access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

CREATE POLICY "Users and admins can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update exams policies for admin access
DROP POLICY IF EXISTS "Teachers can manage own exams" ON public.exams;
DROP POLICY IF EXISTS "Students can view published exams" ON public.exams;

CREATE POLICY "Teachers and admins can manage exams"
ON public.exams
FOR ALL
TO authenticated
USING (
  teacher_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Students can view published exams"
ON public.exams
FOR SELECT
TO authenticated
USING (
  is_published = true 
  AND public.has_role(auth.uid(), 'student')
);

-- Update questions policies for admin access
DROP POLICY IF EXISTS "Teachers can manage questions for own exams" ON public.questions;
DROP POLICY IF EXISTS "Students can view questions for published exams" ON public.questions;

CREATE POLICY "Teachers and admins can manage questions"
ON public.questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE id = exam_id 
    AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Students can view questions for published exams"
ON public.questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE id = exam_id 
    AND is_published = true
  )
);

-- Update exam_submissions policies for admin access
DROP POLICY IF EXISTS "Students can manage own submissions" ON public.exam_submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for own exams" ON public.exam_submissions;
DROP POLICY IF EXISTS "Teachers can update submissions for own exams" ON public.exam_submissions;

CREATE POLICY "Students can manage own submissions"
ON public.exam_submissions
FOR ALL
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers and admins can view all submissions"
ON public.exam_submissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Teachers and admins can update submissions"
ON public.exam_submissions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
);

-- Update student_answers policies for admin access
DROP POLICY IF EXISTS "Students can manage own answers" ON public.student_answers;
DROP POLICY IF EXISTS "Teachers can view answers for own exams" ON public.student_answers;
DROP POLICY IF EXISTS "Teachers can update answers for grading" ON public.student_answers;

CREATE POLICY "Students can manage own answers"
ON public.student_answers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_submissions 
    WHERE id = submission_id 
    AND student_id = auth.uid()
  )
);

CREATE POLICY "Teachers and admins can view and grade answers"
ON public.student_answers
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
);