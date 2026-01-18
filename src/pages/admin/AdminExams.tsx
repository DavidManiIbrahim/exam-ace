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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Search, FileText, Eye, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Exam {
  id: string;
  title: string;
  subject: string;
  exam_type: string;
  class_id?: string;
  class_name?: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_published: boolean;
  results_published: boolean;
  teacher_id: string;
  teacher_name?: string;
}

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  async function fetchExams() {
    const { data: examsData, error: examsError } = await (supabase
      .from('exams') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (examsError) {
      console.error('Error fetching exams:', examsError);
      setLoading(false);
      return;
    }

    // Get teacher names
    const teacherIds = [...new Set(examsData?.map((e: any) => e.teacher_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', teacherIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

    // Get class names
    const classIds = [...new Set(examsData?.map((e: any) => e.class_id).filter(Boolean) || [])];
    const { data: classes } = await (supabase
      .from('classes') as any)
      .select('id, name')
      .in('id', classIds);

    const classMap = new Map((classes as any)?.map((c: any) => [c.id, c.name]) || []);

    const enrichedExams = (examsData || []).map((exam: any) => ({
      ...exam,
      teacher_name: profileMap.get(exam.teacher_id) || 'Unknown',
      class_name: exam.class_id ? classMap.get(exam.class_id) : 'All Classes',
    }));

    setExams(enrichedExams as any);
    setLoading(false);
  }

  const filteredExams = exams.filter(
    (exam) =>
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.teacher_name && exam.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteExam = async (examId: string) => {
    const { error } = await supabase.from('exams').delete().eq('id', examId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete exam. ' + error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Exam Deleted',
      description: 'The exam has been deleted successfully.',
    });
    fetchExams();
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (!exam.is_published) return { label: 'Draft', variant: 'secondary' as const };
    if (now < start) return { label: 'Upcoming', variant: 'outline' as const };
    if (now >= start && now <= end) return { label: 'Active', variant: 'default' as const };
    return { label: 'Completed', variant: 'secondary' as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Manage Exams
            </h1>
            <p className="text-muted-foreground mt-1">View and manage all exams in the system</p>
          </div>
          <Button asChild>
            <Link to="/admin/exams/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Link>
          </Button>
        </div>

        <Card className="exam-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>All Exams ({filteredExams.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exams..."
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
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No exams found matching your search.' : 'No exams created yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Target Class</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExams.map((exam) => {
                      const status = getExamStatus(exam);
                      return (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{exam.exam_type}</Badge>
                          </TableCell>
                          <TableCell>{exam.subject}</TableCell>
                          <TableCell>{exam.class_name}</TableCell>
                          <TableCell>{exam.teacher_name}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/admin/exams/${exam.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{exam.title}" and all associated questions and submissions. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteExam(exam.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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