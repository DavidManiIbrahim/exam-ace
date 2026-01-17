import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Submission {
    id: string;
    exam_id: string;
    student_id: string;
    started_at: string;
    submitted_at: string;
    total_score: number;
    max_score: number;
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

interface Answer {
    id: string;
    question_id: string;
    answer: string;
    is_correct: boolean | null;
    marks_obtained: number | null;
    feedback: string | null;
    question: {
        question_text: string;
        question_type: string;
        correct_answer: string;
        options: string[] | null;
        marks: number;
        explanation: string | null;
    };
}

export default function SubmissionDetail() {
    const { id } = useParams<{ id: string }>();
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id && user) {
            fetchData();
        }
    }, [id, user]);

    const fetchData = async () => {
        try {
            // Fetch submission
            const { data: subData, error: subError } = await (supabase
                .from('exam_submissions') as any)
                .select('*, exam:exams(title, subject, results_published)')
                .eq('id', id)
                .single();

            if (subError) throw subError;

            // Simple security check for students
            if (role === 'student' && !subData.exam.results_published && !subData.is_graded) {
                toast({ title: 'Access Denied', description: 'Results are not yet published for this exam.', variant: 'warning' });
                navigate('/student/results');
                return;
            }

            // Fetch student profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('user_id', subData.student_id)
                .single();

            setSubmission({ ...subData, student_profile: profile });

            // Fetch answers with questions
            const { data: ansData, error: ansError } = await (supabase
                .from('student_answers') as any)
                .select('*, question:questions(*)')
                .eq('submission_id', id);

            if (ansError) throw ansError;

            // Sort by order_index
            const sorted = (ansData || []).sort((a: any, b: any) =>
                (a.question?.order_index || 0) - (b.question?.order_index || 0)
            );

            setAnswers(sorted as any);

        } catch (error) {
            console.error('Error:', error);
            toast({ title: 'Error', description: 'Failed to load submission details', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleGradeUpdate = async (answerId: string, updates: Partial<Answer>) => {
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, ...updates } : a));
    };

    const saveGrading = async () => {
        setSaving(true);
        try {
            // Update each answer
            for (const answer of answers) {
                const { error } = await supabase
                    .from('student_answers')
                    .update({
                        is_correct: answer.is_correct,
                        marks_obtained: answer.marks_obtained,
                        feedback: answer.feedback,
                    })
                    .eq('id', answer.id);

                if (error) throw error;
            }

            // Update submission total score
            const totalScore = answers.reduce((sum, a) => sum + (a.marks_obtained || 0), 0);
            const { error: subError } = await supabase
                .from('exam_submissions')
                .update({
                    total_score: totalScore,
                    is_graded: true,
                })
                .eq('id', id);

            if (subError) throw subError;

            toast({ title: 'Success', description: 'Grading saved successfully' });
            fetchData();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!submission) return null;

    const isTeacher = role === 'teacher' || role === 'admin';

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Results
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
                            Print Review
                        </Button>
                        {isTeacher && (
                            <Button onClick={saveGrading} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Grading
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Exam Review</CardTitle>
                            <CardDescription>
                                Questions and Responses for {submission.exam?.title}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {answers.map((answer, index) => {
                                const isWrong = answer.is_correct === false;
                                return (
                                    <div key={answer.id} className={`p-6 rounded-xl border-2 transition-all ${isWrong ? 'border-destructive/20 bg-destructive/5' : 'bg-muted/30'}`}>
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-primary">QUESTION {index + 1}</span>
                                                    {answer.is_correct === true && <CheckCircle2 className="h-4 w-4 text-success" />}
                                                    {answer.is_correct === false && <XCircle className="h-4 w-4 text-destructive" />}
                                                </div>
                                                <p className="font-semibold text-lg leading-snug">{answer.question?.question_text}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <div className="text-sm font-medium bg-background px-3 py-1 rounded-full border shadow-sm">
                                                    {answer.marks_obtained || 0} / {answer.question?.marks} marks
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-4">
                                            <div className={`p-4 rounded-lg border-l-4 shadow-sm ${isWrong ? 'border-destructive bg-background' : 'border-primary bg-background'}`}>
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Student's Response:</p>
                                                <p className="text-foreground leading-relaxed italic">"{answer.answer || '(No answer provided)'}"</p>
                                            </div>

                                            {(isTeacher || answer.is_correct === false) && answer.question?.question_type === 'mcq' && (
                                                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-success mb-1">Correct Answer:</p>
                                                    <p className="font-medium">{answer.question.correct_answer}</p>
                                                </div>
                                            )}

                                            {answer.question?.explanation && (
                                                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Explanation:</p>
                                                    <p className="text-sm">{answer.question.explanation}</p>
                                                </div>
                                            )}
                                        </div>

                                        {isTeacher ? (
                                            <div className="grid gap-4 sm:grid-cols-2 mt-6 pt-6 border-t">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase">Update Marks</Label>
                                                    <Input
                                                        type="number"
                                                        max={answer.question?.marks}
                                                        value={answer.marks_obtained || 0}
                                                        onChange={(e) => handleGradeUpdate(answer.id, { marks_obtained: Number(e.target.value) })}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase text-primary">Adjust Result</Label>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant={answer.is_correct === true ? 'default' : 'outline'}
                                                            size="sm"
                                                            className="flex-1 h-9"
                                                            onClick={() => handleGradeUpdate(answer.id, { is_correct: true, marks_obtained: answer.question.marks })}
                                                        >
                                                            Mark Correct
                                                        </Button>
                                                        <Button
                                                            variant={answer.is_correct === false ? 'destructive' : 'outline'}
                                                            size="sm"
                                                            className="flex-1 h-9"
                                                            onClick={() => handleGradeUpdate(answer.id, { is_correct: false, marks_obtained: 0 })}
                                                        >
                                                            Mark Wrong
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-2 space-y-2">
                                                    <Label className="text-xs font-bold uppercase">Feedback for Student</Label>
                                                    <Textarea
                                                        placeholder="Add professional feedback..."
                                                        value={answer.feedback || ''}
                                                        onChange={(e) => handleGradeUpdate(answer.id, { feedback: e.target.value })}
                                                        className="min-h-[80px] resize-none"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            answer.feedback && (
                                                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 shadow-inner">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                                                        Teacher's Feedback
                                                    </p>
                                                    <p className="text-sm leading-relaxed text-foreground/90 italic">"{answer.feedback}"</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Student Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-muted-foreground">Name</Label>
                                    <p className="font-medium text-lg">{submission.student_profile?.full_name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium">{submission.student_profile?.email}</p>
                                </div>
                                <div className="pt-4 border-t">
                                    <Label className="text-muted-foreground">Submitted At</Label>
                                    <p className="font-medium">{format(new Date(submission.submitted_at), 'PPP pp')}</p>
                                </div>
                                <div className="pt-4 border-t">
                                    <div className="flex justify-between items-baseline">
                                        <Label className="text-muted-foreground">Total Score</Label>
                                        <span className="text-2xl font-bold">{submission.total_score}/{submission.max_score}</span>
                                    </div>
                                    <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-full transition-all"
                                            style={{ width: `${(submission.total_score / submission.max_score) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-right text-sm text-muted-foreground mt-1">
                                        {Math.round((submission.total_score / submission.max_score) * 100)}%
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
