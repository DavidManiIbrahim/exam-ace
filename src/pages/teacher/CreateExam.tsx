import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';

const examSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject is too long'),
  exam_type: z.string().min(1, 'Exam type is required'),
  class_id: z.string().optional().nullable(),
  description: z.string().max(1000, 'Description is too long').optional(),
  instructions: z.string().max(2000, 'Instructions are too long').optional(),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
});

export default function CreateExam() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    exam_type: 'Exam',
    class_id: '',
    description: '',
    instructions: '',
    duration_minutes: 60,
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    const { data: classesData } = await supabase.from('classes').select('*').order('name');
    const { data: subjectsData } = await supabase.from('subjects').select('*').order('name');
    if (classesData) setClasses(classesData);
    if (subjectsData) setSubjects(subjectsData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = examSchema.parse({
        ...formData,
        duration_minutes: Number(formData.duration_minutes),
      });

      if (new Date(validatedData.end_time) <= new Date(validatedData.start_time)) {
        toast({
          title: 'Validation Error',
          description: 'End time must be after start time',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase
        .from('exams')
        .insert({
          teacher_id: user!.id,
          title: validatedData.title,
          subject: validatedData.subject,
          exam_type: validatedData.exam_type,
          class_id: validatedData.class_id || null,
          description: validatedData.description || null,
          instructions: validatedData.instructions || null,
          duration_minutes: validatedData.duration_minutes,
          start_time: validatedData.start_time,
          end_time: validatedData.end_time,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Exam created successfully! Now add some questions.',
      });

      navigate(`/teacher/exams/${data.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('Error creating exam:', error);
        toast({
          title: 'Error',
          description: 'Failed to create exam',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Exam</h1>
            <p className="text-muted-foreground">Set up your exam details</p>
          </div>
        </div>

        <Card className="exam-card">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>
              Fill in the basic information about your exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Exam Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Midterm Exam"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam_type">Exam Type *</Label>
                  <Select
                    value={formData.exam_type}
                    onValueChange={(v) => setFormData({ ...formData, exam_type: v })}
                  >
                    <SelectTrigger id="exam_type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Exam">Exam</SelectItem>
                      <SelectItem value="C.A Test">C.A Test</SelectItem>
                      <SelectItem value="Quiz">Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(v) => setFormData({ ...formData, subject: v })}
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Target Class</Label>
                  <Select
                    value={formData.class_id}
                    onValueChange={(v) => setFormData({ ...formData, class_id: v })}
                  >
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the exam..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Instructions for students taking the exam..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={480}
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Exam
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
