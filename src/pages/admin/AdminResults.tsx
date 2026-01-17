import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Trophy, Eye } from 'lucide-react';
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
  exam_title?: string;
  student_name?: string;
}

export default function AdminResults() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubmissions();

    const channel = supabase
      .channel('admin-results-changes')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'exam_submissions'
        },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchSubmissions() {
    const { data: submissionsData, error: submissionsError } = await supabase
      .from('exam_submissions')
      .select('*')
      .order('started_at', { ascending: false });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      setLoading(false);
      return;
    }

    // Get exam titles
    const examIds = [...new Set(submissionsData?.map((s) => s.exam_id) || [])];
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title')
      .in('id', examIds);
    const examMap = new Map(exams?.map((e) => [e.id, e.title]) || []);

    // Get student names
    const studentIds = [...new Set(submissionsData?.map((s) => s.student_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', studentIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

    const enrichedSubmissions = (submissionsData || []).map((sub) => ({
      ...sub,
      exam_title: examMap.get(sub.exam_id) || 'Unknown Exam',
      student_name: profileMap.get(sub.student_id) || 'Unknown Student',
    }));

    setSubmissions(enrichedSubmissions);
    setLoading(false);
  }

  const filteredSubmissions = submissions.filter(
    (sub) =>
      (sub.exam_title && sub.exam_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.student_name && sub.student_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getGrade = (score: number | null, maxScore: number | null) => {
    if (score === null || maxScore === null || maxScore === 0) return '-';
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            All Results
          </h1>
          <p className="text-muted-foreground mt-1">View all exam submissions and results</p>
        </div>

        <Card className="exam-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>All Submissions ({filteredSubmissions.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by exam or student..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No submissions found matching your search.' : 'No exam submissions yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.exam_title}</TableCell>
                        <TableCell>{sub.student_name}</TableCell>
                        <TableCell>{format(new Date(sub.started_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          {sub.submitted_at ? format(new Date(sub.submitted_at), 'MMM d, yyyy HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          {sub.total_score !== null && sub.max_score !== null
                            ? `${sub.total_score}/${sub.max_score}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getGrade(sub.total_score, sub.max_score) === 'A' ? 'default' : 'secondary'}>
                            {getGrade(sub.total_score, sub.max_score)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.is_graded ? 'default' : 'outline'}>
                            {sub.is_graded ? 'Graded' : sub.submitted_at ? 'Pending' : 'In Progress'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild disabled={!sub.submitted_at}>
                            <Link to={`/admin/results/${sub.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}