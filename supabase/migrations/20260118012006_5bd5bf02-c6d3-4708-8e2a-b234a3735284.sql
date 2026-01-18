-- Create classes table for managing student classes/departments
CREATE TABLE public.classes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table for managing exam subjects
CREATE TABLE public.subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view classes and subjects
CREATE POLICY "Allow authenticated users to view classes" 
ON public.classes FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to view subjects" 
ON public.subjects FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow admins and teachers to manage classes
CREATE POLICY "Allow admins and teachers to manage classes" 
ON public.classes FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'teacher')
    )
);

-- Allow admins and teachers to manage subjects
CREATE POLICY "Allow admins and teachers to manage subjects" 
ON public.subjects FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'teacher')
    )
);