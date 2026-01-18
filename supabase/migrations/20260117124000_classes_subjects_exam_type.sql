-- Create departments/classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add exam_type enum or column
-- Using literal check for simplicity if ENUMS are already messy
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'Exam' CHECK (exam_type IN ('Exam', 'C.A Test', 'Quiz'));

-- Add class support to exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Enable RLS for new tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Policies for classes
CREATE POLICY "Everyone can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Policies for subjects
CREATE POLICY "Everyone can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert some default data
INSERT INTO public.classes (name) VALUES ('Class 1'), ('Class 2'), ('Class 3') ON CONFLICT DO NOTHING;
INSERT INTO public.subjects (name) VALUES ('Mathematics'), ('English'), ('Science'), ('History') ON CONFLICT DO NOTHING;
