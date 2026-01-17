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
    answer_text: string;
    is_correct: boolean | null;
    marks_awarded: number | null;
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
            const { data: subData, error: subError } = await supabase
                .from('exam_submissions')
                .select('*, exam:exams(title, subject)')
                .eq('id', id)
                .single();

            if (subError) throw subError;

            // Fetch student profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('user_id', subData.student_id)
                .single();

            setSubmission({ ...subData, student_profile: profile });

            // Fetch answers with questions
            const { data: ansData, error: ansError } = await supabase
                .from('student_answers')
                .select('*, question:questions(*)')
                .eq('submission_id', id)
                .order('created_at', { ascending: true });

            if (ansError) throw ansError;
            setAnswers(ansData as any);

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
                        marks_awarded: answer.marks_awarded,
                        feedback: answer.feedback,
                    })
                    .eq('id', answer.id);

                if (error) throw error;
            }

            // Update submission total score
            const totalScore = answers.reduce((sum, a) => sum + (a.marks_awarded || 0), 0);
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
                    {isTeacher && (
                        <Button onClick={saveGrading} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Grading
                        </Button>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Submission Details</CardTitle>
                            <CardDescription>
                                {submission.exam?.title} • {submission.exam?.subject}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {answers.map((answer, index) => (
                                <div key={answer.id} className="p-4 rounded-xl border bg-muted/30 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-primary mb-1">Question {index + 1}</p>
                                            <p className="font-medium">{answer.question?.question_text}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">Max Marks: {answer.question?.marks}</p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-lg bg-card border">
                                        <p className="text-xs text-muted-foreground mb-1">Student's Answer:</p>
                                        <p className="whitespace-pre-wrap">{answer.answer_text}</p>
                                    </div>

                                    {answer.question?.question_type === 'mcq' && (
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-semibold">Correct Answer:</span> {answer.question.correct_answer}
                                        </div>
                                    )}

                                    {isTeacher ? (
                                        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                                            <div className="space-y-2">
                                                <Label>Marks Awarded</Label>
                                                <Input
                                                    type="number"
                                                    max={answer.question?.marks}
                                                    value={answer.marks_awarded || 0}
                                                    onChange={(e) => handleGradeUpdate(answer.id, { marks_awarded: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Feedback</Label>
                                                <Textarea
                                                    placeholder="Add feedback for this answer..."
                                                    value={answer.feedback || ''}
                                                    onChange={(e) => handleGradeUpdate(answer.id, { feedback: e.target.value })}
                                                    className="h-20"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-2 border-t">
                                            <div className="flex items-center gap-2 mb-2">
                                                {answer.is_correct ? (
                                                    <div className="flex items-center gap-1 text-success text-sm font-medium">
                                                        <CheckCircle2 className="h-4 w-4" /> Correct
                                                    </div>
                                                ) : answer.is_correct === false ? (
                                                    <div className="flex items-center gap-1 text-destructive text-sm font-medium">
                                                        <XCircle className="h-4 w-4" /> Incorrect
                                                    </div>
                                                ) : null}
                                                <span className="text-sm">Marks: {answer.marks_awarded || 0}/{answer.question?.marks}</span>
                                            </div>
                                            {answer.feedback && (
                                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                                                    <p className="font-semibold text-primary mb-1">Feedback:</p>
                                                    <p>{answer.feedback}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
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
