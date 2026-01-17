import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Trophy,
    FileText,
    Download,
    GraduationCap,
    TrendingUp,
    Calendar,
    User,
    BookOpen,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ReportCardData {
    profile: {
        full_name: string;
        student_id: string | null;
        class: string | null;
        email: string;
    } | null;
    results: {
        id: string;
        total_score: number;
        max_score: number;
        submitted_at: string;
        exam: {
            title: string;
            subject: string;
            exam_type: string;
        };
    }[];
}

export default function ReportCard() {
    const { user } = useAuth();
    const [data, setData] = useState<ReportCardData>({ profile: null, results: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchReportData();
        }
    }, [user]);

    const fetchReportData = async () => {
        try {
            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, student_id, class, email')
                .eq('user_id', user!.id)
                .single();

            // Fetch published and graded results
            const { data: results } = await supabase
                .from('exam_submissions')
                .select(`
          id,
          total_score,
          max_score,
          submitted_at,
          exam:exams(title, subject, exam_type, results_published)
        `)
                .eq('student_id', user!.id)
                .eq('is_graded', true)
                .filter('exam.results_published', 'eq', true)
                .order('submitted_at', { ascending: false });

            // Filter out null exams (though shouldn't happen with inner join but Supabase sometimes returns null if filter fails)
            const validResults = (results || []).filter(r => r.exam);

            setData({ profile: profile as any, results: validResults as any });
        } catch (error) {
            console.error('Error fetching report card:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        if (data.results.length === 0) return { average: 0, totalObtained: 0, totalMax: 0, grade: 'N/A' };

        const totalObtained = data.results.reduce((sum, r) => sum + (r.total_score || 0), 0);
        const totalMax = data.results.reduce((sum, r) => sum + (r.max_score || 0), 0);
        const average = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

        let grade = 'F';
        if (average >= 90) grade = 'A';
        else if (average >= 80) grade = 'B';
        else if (average >= 70) grade = 'C';
        else if (average >= 60) grade = 'D';

        return { average: Math.round(average), totalObtained, totalMax, grade };
    };

    const getResultGrade = (score: number, max: number) => {
        const pct = (score / max) * 100;
        if (pct >= 90) return 'A';
        if (pct >= 80) return 'B';
        if (pct >= 70) return 'C';
        if (pct >= 60) return 'D';
        return 'F';
    };

    const stats = calculateStats();

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Academic Report Card</h1>
                        <p className="text-muted-foreground">Comprehensive record of all your published results</p>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                        <Download className="h-4 w-4" />
                        Download Report
                    </Button>
                </div>

                {/* Student Information Card */}
                <Card className="overflow-hidden border-2 border-primary/10">
                    <div className="h-2 bg-primary w-full" />
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Student Name</p>
                                    <p className="font-bold text-lg">{data.profile?.full_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Student ID</p>
                                    <p className="font-bold text-lg">{data.profile?.student_id || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Class</p>
                                    <p className="font-bold text-lg">{data.profile?.class || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Academic Session</p>
                                    <p className="font-bold text-lg">2023 / 2024</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Overview */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="exam-card bg-primary text-primary-foreground">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm opacity-80 mb-1 font-medium">Average Performance</p>
                                    <h3 className="text-4xl font-black">{stats.average}%</h3>
                                </div>
                                <div className="p-2 rounded-lg bg-white/20">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="exam-card">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1 font-medium">Total Subjects</p>
                                    <h3 className="text-4xl font-black text-foreground">
                                        {[...new Set(data.results.map(r => r.exam.subject))].length}
                                    </h3>
                                </div>
                                <div className="p-2 rounded-lg bg-success/10 text-success">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="exam-card">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1 font-medium">Overall Grade</p>
                                    <h3 className={`text-4xl font-black ${stats.grade === 'F' ? 'text-destructive' : 'text-primary'}`}>
                                        {stats.grade}
                                    </h3>
                                </div>
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Trophy className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Table */}
                <Card className="exam-card overflow-hidden">
                    <CardHeader>
                        <CardTitle>Continuous Assessment & Examination Record</CardTitle>
                        <CardDescription>Breakdown of performance in all evaluatory activities</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {data.results.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No published results found for this session.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-bold">Subject</TableHead>
                                            <TableHead className="font-bold">Exam / Test Title</TableHead>
                                            <TableHead className="font-bold">Type</TableHead>
                                            <TableHead className="font-bold">Score</TableHead>
                                            <TableHead className="font-bold">Percentage</TableHead>
                                            <TableHead className="font-bold">Grade</TableHead>
                                            <TableHead className="font-bold">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.results.map((result) => (
                                            <TableRow key={result.id} className="hover:bg-muted/30">
                                                <TableCell className="font-bold text-primary">{result.exam.subject}</TableCell>
                                                <TableCell className="font-medium">{result.exam.title}</TableCell>
                                                <TableCell>
                                                    <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border">
                                                        {result.exam.exam_type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    {result.total_score} / {result.max_score}
                                                </TableCell>
                                                <TableCell>
                                                    {Math.round((result.total_score / result.max_score) * 100)}%
                                                </TableCell>
                                                <TableCell>
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs",
                                                        getResultGrade(result.total_score, result.max_score) === 'F'
                                                            ? "bg-destructive/10 text-destructive"
                                                            : "bg-success/10 text-success"
                                                    )}>
                                                        {getResultGrade(result.total_score, result.max_score)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {format(new Date(result.submitted_at), 'MMM d, yyyy')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                    {data.results.length > 0 && (
                        <div className="bg-primary/5 p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm font-medium text-muted-foreground">
                                Showing evaluation for <span className="text-foreground">{data.results.length}</span> activities in the current session.
                            </div>
                            <div className="flex gap-8">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Marks</p>
                                    <p className="text-xl font-black text-foreground">{stats.totalObtained} / {stats.totalMax}</p>
                                </div>
                                <div className="text-center border-l pl-8 font-black">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Aggregate Avg.</p>
                                    <p className="text-xl font-black text-primary">{stats.average}%</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          .no-print, header, aside, button { display: none !important; }
          .lg\\:pl-64 { padding-left: 0 !important; }
          main { padding: 0 !important; }
          .exam-card { border: 1px solid #eee !important; box-shadow: none !important; }
          .bg-primary { background-color: #000 !important; color: #fff !important; }
          .text-primary { color: #000 !important; }
        }
      `}} />
        </DashboardLayout>
    );
}
