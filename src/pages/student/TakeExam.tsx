import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Clock, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface Question { id: string; question_text: string; question_type: string; options: string[] | null; marks: number; order_index: number; }
interface Exam { id: string; title: string; subject: string; instructions: string | null; duration_minutes: number; }

export default function TakeExam() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => { if (id && user) initExam(); }, [id, user]);

  const initExam = async () => {
    try {
      const { data: examData } = await supabase.from('exams').select('*').eq('id', id).single();
      if (!examData) { navigate('/student'); return; }
      setExam(examData);
      
      const { data: questionsData } = await supabase.from('questions').select('*').eq('exam_id', id).order('order_index');
      setQuestions(questionsData?.map(q => ({ ...q, options: q.options as string[] | null })) || []);

      let { data: sub } = await supabase.from('exam_submissions').select('*').eq('exam_id', id).eq('student_id', user!.id).maybeSingle();
      if (sub?.submitted_at) { navigate('/student/results'); return; }
      if (!sub) {
        const { data: newSub } = await supabase.from('exam_submissions').insert({ exam_id: id, student_id: user!.id }).select().single();
        sub = newSub;
      }
      setSubmissionId(sub?.id || null);
      
      const elapsed = Math.floor((Date.now() - new Date(sub?.started_at || Date.now()).getTime()) / 1000);
      setTimeLeft(Math.max(0, examData.duration_minutes * 60 - elapsed));

      const { data: savedAnswers } = await supabase.from('student_answers').select('question_id, answer').eq('submission_id', sub?.id);
      const ansMap: Record<string, string> = {};
      savedAnswers?.forEach(a => { ansMap[a.question_id] = a.answer || ''; });
      setAnswers(ansMap);
    } catch (error) { console.error(error); toast({ title: 'Error', description: 'Failed to load exam', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => { if (t <= 1) { handleSubmit(); return 0; } return t - 1; }), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const saveAnswer = useCallback(async (qId: string, answer: string) => {
    if (!submissionId) return;
    await supabase.from('student_answers').upsert({ submission_id: submissionId, question_id: qId, answer }, { onConflict: 'submission_id,question_id' });
  }, [submissionId]);

  const handleAnswerChange = (qId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [qId]: answer }));
    saveAnswer(qId, answer);
  };

  const handleSubmit = async () => {
    if (!submissionId || submitting) return;
    setSubmitting(true);
    try {
      let totalScore = 0, maxScore = 0;
      const { data: questionsWithAnswers } = await supabase.from('questions').select('*').eq('exam_id', id);
      
      for (const q of questionsWithAnswers || []) {
        maxScore += q.marks;
        const studentAns = answers[q.id] || '';
        const isCorrect = q.question_type === 'mcq' && studentAns.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
        if (isCorrect) totalScore += q.marks;
        await supabase.from('student_answers').upsert({
          submission_id: submissionId, question_id: q.id, answer: studentAns,
          is_correct: q.question_type === 'mcq' ? isCorrect : null,
          marks_obtained: q.question_type === 'mcq' ? (isCorrect ? q.marks : 0) : null
        }, { onConflict: 'submission_id,question_id' });
      }

      await supabase.from('exam_submissions').update({
        submitted_at: new Date().toISOString(), total_score: totalScore, max_score: maxScore,
        is_graded: questionsWithAnswers?.every(q => q.question_type === 'mcq') || false
      }).eq('id', submissionId);

      toast({ title: 'Success', description: 'Exam submitted successfully!' });
      navigate('/student/results');
    } catch (error) { console.error(error); toast({ title: 'Error', description: 'Failed to submit', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!exam) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div><h1 className="font-bold">{exam.title}</h1><p className="text-sm text-muted-foreground">{exam.subject}</p></div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            <Clock className="h-5 w-5" />
            <span className="timer-display">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2"><span>Question {currentQ + 1} of {questions.length}</span><span>{Math.round(progress)}%</span></div>
          <Progress value={progress} className="h-2" />
        </div>

        {timeLeft < 300 && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Less than 5 minutes remaining!</div>}

        {q && (
          <Card className="exam-card mb-6">
            <CardHeader><div className="flex justify-between"><span className="text-sm text-muted-foreground">{q.question_type.toUpperCase()}</span><span className="text-sm">{q.marks} mark{q.marks > 1 ? 's' : ''}</span></div><CardTitle className="text-lg mt-2">{q.question_text}</CardTitle></CardHeader>
            <CardContent>
              {q.question_type === 'mcq' && q.options ? (
                <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => handleAnswerChange(q.id, v)} className="space-y-3">
                  {q.options.map((opt, i) => (
                    <div key={i} className={`question-option ${answers[q.id] === opt ? 'question-option-selected' : ''}`} onClick={() => handleAnswerChange(q.id, opt)}>
                      <RadioGroupItem value={opt} id={`opt-${i}`} /><Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{String.fromCharCode(65 + i)}. {opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea placeholder="Type your answer..." value={answers[q.id] || ''} onChange={(e) => handleAnswerChange(q.id, e.target.value)} rows={4} />
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={() => setCurrentQ(c => c - 1)} disabled={currentQ === 0}>Previous</Button>
          <div className="flex gap-2">
            {currentQ < questions.length - 1 ? (
              <Button onClick={() => setCurrentQ(c => c + 1)}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="bg-success hover:bg-success/90">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Submit Exam
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)} className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${i === currentQ ? 'bg-primary text-primary-foreground' : answers[questions[i]?.id] ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{i + 1}</button>
          ))}
        </div>
      </main>
    </div>
  );
}
