import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, FileText, Trophy, ArrowRight, Shield } from 'lucide-react';

interface Stats {
  totalTeachers: number;
  totalStudents: number;
  totalExams: number;
  totalSubmissions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalExams: 0,
    totalSubmissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [teachersResult, studentsResult, examsResult, submissionsResult] = await Promise.all([
        supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'teacher'),
        supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('exams').select('id', { count: 'exact' }),
        supabase.from('exam_submissions').select('id', { count: 'exact' }),
      ]);

      setStats({
        totalTeachers: teachersResult.count || 0,
        totalStudents: studentsResult.count || 0,
        totalExams: examsResult.count || 0,
        totalSubmissions: submissionsResult.count || 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Teachers', value: stats.totalTeachers, icon: GraduationCap, color: 'text-blue-600', href: '/admin/teachers' },
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-green-600', href: '/admin/students' },
    { title: 'Total Exams', value: stats.totalExams, icon: FileText, color: 'text-purple-600', href: '/admin/exams' },
    { title: 'Total Submissions', value: stats.totalSubmissions, icon: Trophy, color: 'text-orange-600', href: '/admin/results' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Complete system overview and management</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="exam-card hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {loading ? '...' : stat.value}
                </div>
                <Link 
                  to={stat.href}
                  className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                >
                  View details <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="exam-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Quick Actions - Teachers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link to="/admin/teachers">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Teachers
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/admin/exams">
                  <FileText className="h-4 w-4 mr-2" />
                  View All Exams
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="exam-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Quick Actions - Students
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link to="/admin/students">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Students
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/admin/results">
                  <Trophy className="h-4 w-4 mr-2" />
                  View All Results
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}