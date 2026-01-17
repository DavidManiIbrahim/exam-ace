import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, FileText, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Result {
  id: string; exam_id: string; submitted_at: string; total_score: number; max_score: number; is_graded: boolean;
  exam: { title: string; subject: string; results_published: boolean };
}

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchResults();

      const submissionsChannel = supabase
        .channel('student-results-submissions')
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'exam_submissions',
            filter: `student_id=eq.${user.id}`,
          },
          () => {
            fetchResults();
          }
        )
        .subscribe();

      const examsChannel = supabase
        .channel('student-results-exams')
        .on(
          'postgres_changes' as any,
          {
            event: 'update',
            schema: 'public',
            table: 'exams'
          },
          () => {
            fetchResults();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(submissionsChannel);
        supabase.removeChannel(examsChannel);
      };
    }
  }, [user]);

  const fetchResults = async () => {
    try {
      const { data } = await supabase.from('exam_submissions').select('*, exam:exams(title, subject, results_published)')
        .eq('student_id', user!.id).not('submitted_at', 'is', null).order('submitted_at', { ascending: false });
      setResults(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const getGrade = (pct: number) => {
    if (pct >= 90) return { grade: 'A', color: 'text-success' };
    if (pct >= 80) return { grade: 'B', color: 'text-success' };
    if (pct >= 70) return { grade: 'C', color: 'text-warning' };
    if (pct >= 60) return { grade: 'D', color: 'text-warning' };
    return { grade: 'F', color: 'text-destructive' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-2xl font-bold">My Results</h1><p className="text-muted-foreground">View your exam scores and performance</p></div>

        {loading ? <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div> :
          results.length === 0 ? <Card className="exam-card"><CardContent className="py-12 text-center"><Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p>No results yet. Complete an exam to see your scores!</p></CardContent></Card> :
            <div className="space-y-4">{results.map(result => {
              const pct = Math.round((result.total_score / result.max_score) * 100);
              const { grade, color } = getGrade(pct);
              const published = result.exam?.results_published;
              return (
                <Card key={result.id} className="exam-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
                        <div>
                          <h3 className="font-semibold">{result.exam?.title}</h3>
                          <p className="text-sm text-muted-foreground">{result.exam?.subject} • {format(new Date(result.submitted_at), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      {published ? (
                        <div className="text-right">
                          <div className="flex items-center gap-3">
                            <div><p className="text-2xl font-bold">{result.total_score}/{result.max_score}</p><p className="text-sm text-muted-foreground">{pct}%</p></div>
                            <div className={`text-3xl font-bold ${color}`}>{grade}</div>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-sm">{pct >= 60 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}<span className={pct >= 60 ? 'text-success' : 'text-destructive'}>{pct >= 60 ? 'Passed' : 'Failed'}</span></div>
                        </div>
                      ) : (
                        <div className="status-badge status-upcoming">Results Pending</div>
                      )}
                      {result.is_graded && (
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <Link to={`/student/results/${result.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Detail
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}</div>
        }
      </div>
    </DashboardLayout>
  );
}
