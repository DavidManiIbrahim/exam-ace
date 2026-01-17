-- Add feedback column to student_answers if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_answers' AND column_name = 'feedback') THEN 
    ALTER TABLE public.student_answers ADD COLUMN feedback TEXT; 
  END IF; 
END $$;
