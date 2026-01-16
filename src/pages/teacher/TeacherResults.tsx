import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Trophy,
  FileText,
  User,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface Submission {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number | null;
  max_score: number | null;
  is_graded: boolean;
  exam: {
    title: string;
    subject: string;
  };
  student_profile: {
    full_name: string;
    email: string;
  } | null;
}

export default function TeacherResults() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [publishingResults, setPublishingResults] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
  }, [user]);

  const fetchSubmissions = async () => {
    try {
      // Get all exams for this teacher
      const { data: exams, error: examsError } = await supabase
        .from('exams')
        .select('id')
        .eq('teacher_id', user!.id);

      if (examsError) throw examsError;

      if (!exams || exams.length === 0) {
        setSubmissions([]);
        return;
      }

      const examIds = exams.map((e) => e.id);

      // Get all submissions for these exams
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('exam_submissions')
        .select(`
          *,
          exam:exams(title, subject)
        `)
        .in('exam_id', examIds)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Get student profiles
      const studentIds = [...new Set(submissionsData?.map((s) => s.student_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]));

      const enrichedSubmissions = submissionsData?.map((s) => ({
        ...s,
        student_profile: profilesMap.get(s.student_id) || null,
      })) || [];

      setSubmissions(enrichedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResults = async (examId: string) => {
    setPublishingResults(examId);
    try {
      const { error } = await supabase
        .from('exams')
        .update({ results_published: true })
        .eq('id', examId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Results published successfully',
      });
    } catch (error) {
      console.error('Error publishing results:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish results',
        variant: 'destructive',
      });
    } finally {
      setPublishingResults(null);
    }
  };

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.exam?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.exam?.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_profile?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_profile?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingGrading = submissions.filter((s) => !s.is_graded).length;
  const gradedSubmissions = submissions.filter((s) => s.is_graded).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Results</h1>
          <p className="text-muted-foreground">View and manage exam submissions</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="exam-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-xl font-bold text-foreground">{submissions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="exam-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Graded</p>
                <p className="text-xl font-bold text-foreground">{gradedSubmissions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="exam-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Grading</p>
                <p className="text-xl font-bold text-foreground">{pendingGrading}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Submissions List */}
        <Card className="exam-card">
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  {searchQuery ? 'No submissions found' : 'No submissions yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Submissions will appear here once students complete exams'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {submission.student_profile?.full_name || 'Unknown Student'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {submission.exam?.title} • {submission.exam?.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {format(new Date(submission.submitted_at!), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {submission.is_graded ? (
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            {submission.total_score}/{submission.max_score}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(((submission.total_score || 0) / (submission.max_score || 1)) * 100)}%
                          </p>
                        </div>
                      ) : (
                        <span className="status-badge status-upcoming">Pending</span>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/teacher/results/${submission.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
