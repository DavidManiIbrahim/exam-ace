import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Search,
    Users,
    Mail,
    Calendar,
    Trophy,
    FileText,
    Download,
    GraduationCap,
    TrendingUp,
    BookOpen,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Student {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    student_id: string | null;
    class: string | null;
    created_at: string;
}

interface ReportData {
    results: {
        id: string;
        total_score: number;
        max_score: number;
        submitted_at: string;
        exam: {
            title: string;
            subject: string;
            results_published: boolean;
        };
    }[];
}

export default function TeacherReportCards() {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    if (selectedStudent) {
        return (
            <DashboardLayout>
                <ReportCardView student={selectedStudent} onBack={() => setSelectedStudent(null)} />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <StudentListView onSelect={setSelectedStudent} />
        </DashboardLayout>
    );
}

function StudentListView({ onSelect }: { onSelect: (student: Student) => void }) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data: studentRoles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'student');

            if (rolesError) throw rolesError;

            if (!studentRoles || studentRoles.length === 0) {
                setStudents([]);
                return;
            }

            const studentIds = studentRoles.map((r) => r.user_id);

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', studentIds);

            if (profilesError) throw profilesError;
            setStudents(profiles || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(
        (student) =>
            student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.student_id && student.student_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (student.class && student.class.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Student Report Cards</h1>
                <p className="text-muted-foreground">Select a student to view and print their report card</p>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredStudents.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No students found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredStudents.map((student) => (
                        <Card
                            key={student.id}
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => onSelect(student)}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                            {student.full_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-foreground truncate">
                                            {student.full_name}
                                        </h3>
                                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3.5 w-3.5" />
                                                <span className="truncate">{student.email}</span>
                                            </div>
                                            {student.class && (
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-3.5 w-3.5" />
                                                    <span>Class: {student.class}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function ReportCardView({ student, onBack }: { student: Student; onBack: () => void }) {
    const [results, setResults] = useState<ReportData['results']>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReportData();
    }, [student.user_id]);

    const fetchReportData = async () => {
        try {
            const { data } = await supabase
                .from('exam_submissions')
                .select(`
          id,
          total_score,
          max_score,
          submitted_at,
          exam:exams(title, subject, results_published)
        `)
                .eq('student_id', student.user_id)
                .eq('is_graded', true)
                .filter('exam.results_published', 'eq', true) // Only show published results? Or maybe all for heater? Prompt says "auto fill", usually requires published. Use published for consistency.
                .order('submitted_at', { ascending: false });

            // Filter out null exams
            const validResults = (data || []).filter(r => r.exam);
            setResults(validResults as any);
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        if (results.length === 0) return { average: 0, totalObtained: 0, totalMax: 0, grade: 'N/A' };
        const totalObtained = results.reduce((sum, r) => sum + (r.total_score || 0), 0);
        const totalMax = results.reduce((sum, r) => sum + (r.max_score || 0), 0);
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

    const downloadPDF = () => {
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(`Academic Report Card`, 14, 20);

        // Student Info
        doc.setFontSize(12);
        doc.text(`Name: ${student.full_name}`, 14, 30);
        doc.text(`ID: ${student.student_id || 'N/A'}`, 14, 36);
        doc.text(`Class: ${student.class || 'N/A'}`, 14, 42);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 48);

        // Stats
        const stats = calculateStats();
        doc.text(`Average: ${stats.average}%`, 140, 30);
        doc.text(`Grade: ${stats.grade}`, 140, 36);

        // Table
        const tableColumn = ["Subject", "Exam", "Score", "Percentage", "Grade"];
        const tableRows = results.map(result => {
            const pct = Math.round((result.total_score / result.max_score) * 100);
            return [
                result.exam.subject,
                result.exam.title,
                `${result.total_score}/${result.max_score}`,
                `${pct}%`,
                getResultGrade(result.total_score, result.max_score)
            ];
        });

        autoTable(doc, {
            startY: 55,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
        });

        doc.save(`${student.full_name.replace(/\s+/g, '_')}_Report_Card.pdf`);
    };

    const stats = calculateStats();

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Report Card: {student.full_name}</h1>
                    <p className="text-muted-foreground">{student.student_id} • {student.class}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" onClick={downloadPDF} className="gap-2">
                        <Download className="h-4 w-4" />
                        Download PDF
                    </Button>
                    <Button variant="outline" onClick={() => window.print()} className="gap-2">
                        <FileText className="h-4 w-4" />
                        Print
                    </Button>
                </div>
            </div>

            {/* Performance Overview */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="exam-card bg-primary text-primary-foreground">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm opacity-80 mb-1 font-medium">Average</p>
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
                                    {[...new Set(results.map(r => r.exam.subject))].length}
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

            <Card className="exam-card overflow-hidden">
                <CardHeader>
                    <CardTitle>Detailed Results</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold">Subject</TableHead>
                                    <TableHead className="font-bold">Exam</TableHead>
                                    <TableHead className="font-bold">Score</TableHead>
                                    <TableHead className="font-bold">Percentage</TableHead>
                                    <TableHead className="font-bold">Grade</TableHead>
                                    <TableHead className="font-bold">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No results found for this student.
                                        </TableCell>
                                    </TableRow>
                                ) : results.map((result) => (
                                    <TableRow key={result.id} className="hover:bg-muted/30">
                                        <TableCell className="font-bold text-primary">{result.exam.subject}</TableCell>
                                        <TableCell className="font-medium">{result.exam.title}</TableCell>
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
                </CardContent>
            </Card>

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
        </div>
    );
}
