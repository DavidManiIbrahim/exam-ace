import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Calendar, Play } from 'lucide-react';
import { format } from 'date-fns';

interface Exam {
  id: string; title: string; subject: string; duration_minutes: number; start_time: string; end_time: string;
  submission?: { submitted_at: string | null } | null;
}

export default function StudentExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchExams(); }, [user]);

  const fetchExams = async () => {
    try {
      const { data: examsData } = await supabase.from('exams').select('*').eq('is_published', true).order('start_time', { ascending: false });
      const { data: submissions } = await supabase.from('exam_submissions').select('exam_id, submitted_at').eq('student_id', user!.id);
      const map = new Map(submissions?.map(s => [s.exam_id, s]));
      setExams(examsData?.map(e => ({ ...e, submission: map.get(e.id) })) || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const getStatus = (exam: Exam) => {
    const now = new Date();
    if (exam.submission?.submitted_at) return { label: 'Completed', class: 'status-completed', canTake: false };
    if (now < new Date(exam.start_time)) return { label: 'Upcoming', class: 'status-upcoming', canTake: false };
    if (now <= new Date(exam.end_time)) return { label: 'Active', class: 'status-active', canTake: true };
    return { label: 'Expired', class: 'status-completed', canTake: false };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-2xl font-bold">My Exams</h1><p className="text-muted-foreground">View and take available exams</p></div>
        {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}</div> :
          exams.length === 0 ? <Card className="exam-card"><CardContent className="py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p>No exams available</p></CardContent></Card> :
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{exams.map(exam => {
            const status = getStatus(exam);
            return (
              <Card key={exam.id} className="exam-card"><CardContent className="p-6">
                <div className="flex justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                  <span className={`status-badge ${status.class}`}>{status.label}</span>
                </div>
                <h3 className="font-semibold mb-1">{exam.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{exam.subject}</p>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{exam.duration_minutes} min</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(exam.start_time), 'MMM dd, HH:mm')}</div>
                </div>
                {status.canTake && <Button className="w-full" asChild><Link to={`/student/exams/${exam.id}/take`}><Play className="h-4 w-4 mr-2" />Start Exam</Link></Button>}
              </CardContent></Card>
            );
          })}</div>
        }
      </div>
    </DashboardLayout>
  );
}
