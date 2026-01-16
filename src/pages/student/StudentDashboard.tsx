import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle2, Trophy, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface Exam {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  submission?: { submitted_at: string | null; total_score: number | null; max_score: number | null } | null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchExams();
  }, [user]);

  const fetchExams = async () => {
    try {
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .eq('is_published', true)
        .order('start_time', { ascending: false })
        .limit(10);

      const { data: submissions } = await supabase
        .from('exam_submissions')
        .select('exam_id, submitted_at, total_score, max_score')
        .eq('student_id', user!.id);

      const submissionsMap = new Map(submissions?.map(s => [s.exam_id, s]));
      setExams(examsData?.map(e => ({ ...e, submission: submissionsMap.get(e.id) })) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (exam: Exam) => {
    const now = new Date();
    if (exam.submission?.submitted_at) return { label: 'Completed', class: 'status-completed' };
    if (now < new Date(exam.start_time)) return { label: 'Upcoming', class: 'status-upcoming' };
    if (now <= new Date(exam.end_time)) return { label: 'Active', class: 'status-active' };
    return { label: 'Expired', class: 'status-completed' };
  };

  const activeExams = exams.filter(e => !e.submission?.submitted_at && new Date() >= new Date(e.start_time) && new Date() <= new Date(e.end_time));
  const completedExams = exams.filter(e => e.submission?.submitted_at);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome! View your exams and results.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="exam-card"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Available Exams</p><p className="text-xl font-bold">{exams.length}</p></div>
          </CardContent></Card>
          <Card className="exam-card"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><Clock className="h-5 w-5 text-success" /></div>
            <div><p className="text-sm text-muted-foreground">Active Now</p><p className="text-xl font-bold">{activeExams.length}</p></div>
          </CardContent></Card>
          <Card className="exam-card"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10"><CheckCircle2 className="h-5 w-5 text-secondary" /></div>
            <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-xl font-bold">{completedExams.length}</p></div>
          </CardContent></Card>
        </div>

        <Card className="exam-card">
          <div className="p-6 flex justify-between items-center border-b">
            <h2 className="font-semibold">Recent Exams</h2>
            <Button variant="ghost" asChild><Link to="/student/exams">View All<ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
          </div>
          <CardContent className="p-6">
            {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div> :
              exams.length === 0 ? <div className="text-center py-8"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No exams available yet</p></div> :
              <div className="space-y-3">{exams.slice(0, 5).map(exam => {
                const status = getStatus(exam);
                return (
                  <Link key={exam.id} to={status.label === 'Active' ? `/student/exams/${exam.id}/take` : `/student/exams`} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                      <div>
                        <h4 className="font-medium">{exam.title}</h4>
                        <p className="text-sm text-muted-foreground">{exam.subject} • {exam.duration_minutes} min</p>
                      </div>
                    </div>
                    <span className={`status-badge ${status.class}`}>{status.label}</span>
                  </Link>
                );
              })}</div>
            }
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
