import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Users,
  Trophy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  totalExams: number;
  activeExams: number;
  totalStudents: number;
  pendingGrading: number;
}

interface RecentExam {
  id: string;
  title: string;
  subject: string;
  start_time: string;
  end_time: string;
  is_published: boolean;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalExams: 0,
    activeExams: 0,
    totalStudents: 0,
    pendingGrading: 0,
  });
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();

      const examsChannel = supabase
        .channel('teacher-dashboard-exams')
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'exams',
            filter: `teacher_id=eq.${user.id}`,
          },
          () => {
            fetchDashboardData();
          }
        )
        .subscribe();

      const submissionsChannel = supabase
        .channel('teacher-dashboard-submissions')
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'exam_submissions'
          },
          () => {
            fetchDashboardData();
          }
        )
        .subscribe();

      const rolesChannel = supabase
        .channel('teacher-dashboard-roles')
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'user_roles',
            filter: 'role=eq.student',
          },
          () => {
            fetchDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(examsChannel);
        supabase.removeChannel(submissionsChannel);
        supabase.removeChannel(rolesChannel);
      };
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date().toISOString();

      // Fetch stats in parallel for better performance
      const [examsResult, submissionsResult, studentsResult] = await Promise.all([
        supabase.from('exams').select('id', { count: 'exact' }).eq('teacher_id', user!.id),
        supabase.from('exam_submissions').select('id', { count: 'exact', head: true }).eq('is_graded', false).not('submitted_at', 'is', null),
        supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'student')
      ]);

      const exams = (await supabase.from('exams').select('*').eq('teacher_id', user!.id).order('created_at', { ascending: false })).data;

      const activeCount = exams?.filter(
        (exam) => exam.is_published && new Date(exam.start_time) <= new Date() && new Date(exam.end_time) >= new Date()
      ).length || 0;

      setStats({
        totalExams: examsResult.count || 0,
        activeExams: activeCount,
        totalStudents: studentsResult.count || 0,
        pendingGrading: submissionsResult.count || 0,
      });

      setRecentExams(exams?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam: RecentExam) => {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (!exam.is_published) {
      return { label: 'Draft', className: 'status-badge bg-muted text-muted-foreground' };
    }
    if (now < start) {
      return { label: 'Upcoming', className: 'status-badge status-upcoming' };
    }
    if (now >= start && now <= end) {
      return { label: 'Active', className: 'status-badge status-active' };
    }
    return { label: 'Completed', className: 'status-badge status-completed' };
  };

  const statCards = [
    {
      title: 'Total Exams',
      value: stats.totalExams,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Active Exams',
      value: stats.activeExams,
      icon: Clock,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      title: 'Pending Grading',
      value: stats.pendingGrading,
      icon: AlertCircle,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your exam overview.</p>
          </div>
          <Button asChild>
            <Link to="/teacher/exams/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="exam-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Exams */}
        <Card className="exam-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Exams</CardTitle>
              <CardDescription>Your latest created exams</CardDescription>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/teacher/exams">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentExams.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">No exams yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first exam to get started
                </p>
                <Button asChild>
                  <Link to="/teacher/exams/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Exam
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExams.map((exam) => {
                  const status = getExamStatus(exam);
                  return (
                    <Link
                      key={exam.id}
                      to={`/teacher/exams/${exam.id}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{exam.title}</h4>
                          <p className="text-sm text-muted-foreground">{exam.subject}</p>
                        </div>
                      </div>
                      <span className={status.className}>{status.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
