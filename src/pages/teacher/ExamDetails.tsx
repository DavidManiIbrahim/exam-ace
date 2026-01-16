import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  FileText,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';

interface Exam {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  instructions: string | null;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_published: boolean;
  results_published: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  marks: number;
  order_index: number;
}

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Question form state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: '',
    marks: 1,
  });
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchExamData();
    }
  }, [id, user]);

  const fetchExamData = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user!.id)
        .single();

      if (examError) throw examError;
      setExam(examData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', id)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData.map(q => ({
        ...q,
        options: q.options as string[] | null
      })));
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exam details',
        variant: 'destructive',
      });
      navigate('/teacher/exams');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!exam) return;

    if (!exam.is_published && questions.length === 0) {
      toast({
        title: 'Cannot Publish',
        description: 'Please add at least one question before publishing',
        variant: 'destructive',
      });
      return;
    }

    setPublishing(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: !exam.is_published })
        .eq('id', exam.id);

      if (error) throw error;

      setExam({ ...exam, is_published: !exam.is_published });
      toast({
        title: 'Success',
        description: exam.is_published ? 'Exam unpublished' : 'Exam published successfully',
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exam',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  const openQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer,
        marks: question.marks,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        marks: 1,
      });
    }
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Question text is required',
        variant: 'destructive',
      });
      return;
    }

    if (questionForm.question_type === 'mcq') {
      const validOptions = questionForm.options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        toast({
          title: 'Validation Error',
          description: 'Please provide at least 2 options for MCQ',
          variant: 'destructive',
        });
        return;
      }
      if (!validOptions.includes(questionForm.correct_answer)) {
        toast({
          title: 'Validation Error',
          description: 'Correct answer must match one of the options',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!questionForm.correct_answer.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Correct answer is required',
        variant: 'destructive',
      });
      return;
    }

    setSavingQuestion(true);
    try {
      const questionData = {
        exam_id: id!,
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        options: questionForm.question_type === 'mcq' 
          ? questionForm.options.filter((o) => o.trim()) 
          : null,
        correct_answer: questionForm.correct_answer,
        marks: questionForm.marks,
        order_index: editingQuestion ? editingQuestion.order_index : questions.length,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        setQuestions(questions.map((q) =>
          q.id === editingQuestion.id ? { ...q, ...questionData, options: questionData.options } : q
        ));
        toast({ title: 'Success', description: 'Question updated' });
      } else {
        const { data, error } = await supabase
          .from('questions')
          .insert(questionData)
          .select()
          .single();

        if (error) throw error;
        setQuestions([...questions, { ...data, options: data.options as string[] | null }]);
        toast({ title: 'Success', description: 'Question added' });
      }

      setQuestionDialogOpen(false);
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: 'Error',
        description: 'Failed to save question',
        variant: 'destructive',
      });
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionToDelete);

      if (error) throw error;

      setQuestions(questions.filter((q) => q.id !== questionToDelete));
      toast({ title: 'Success', description: 'Question deleted' });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete question',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  const getExamStatus = () => {
    if (!exam) return null;
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Exam not found</h2>
          <Button asChild className="mt-4">
            <Link to="/teacher/exams">Back to Exams</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = getExamStatus();
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/exams')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{exam.title}</h1>
                {status && <span className={status.className}>{status.label}</span>}
              </div>
              <p className="text-muted-foreground">{exam.subject}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePublishToggle}
              disabled={publishing}
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : exam.is_published ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {exam.is_published ? 'Unpublish' : 'Publish'}
            </Button>
            <Button asChild>
              <Link to={`/teacher/exams/${exam.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Exam
              </Link>
            </Button>
          </div>
        </div>

        {/* Exam Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="exam-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold text-foreground">{exam.duration_minutes} min</p>
              </div>
            </CardContent>
          </Card>
          <Card className="exam-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <FileText className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="font-semibold text-foreground">{questions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="exam-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="font-semibold text-foreground">{totalMarks}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="exam-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-semibold text-foreground">
                  {format(new Date(exam.start_time), 'MMM dd, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        {exam.instructions && (
          <Card className="exam-card">
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{exam.instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        <Card className="exam-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>
                {questions.length} question{questions.length !== 1 ? 's' : ''} • {totalMarks} total marks
              </CardDescription>
            </div>
            <Button onClick={() => openQuestionDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">No questions yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add questions to your exam
                </p>
                <Button onClick={() => openQuestionDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                            Q{index + 1}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {question.question_type.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {question.marks} mark{question.marks !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-foreground">{question.question_text}</p>
                        {question.options && (
                          <div className="mt-3 space-y-1">
                            {question.options.map((option, i) => (
                              <div
                                key={i}
                                className={`text-sm px-3 py-1.5 rounded ${
                                  option === question.correct_answer
                                    ? 'bg-success/10 text-success'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {String.fromCharCode(65 + i)}. {option}
                                {option === question.correct_answer && (
                                  <CheckCircle2 className="h-3.5 w-3.5 inline ml-2" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openQuestionDialog(question)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setQuestionToDelete(question.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
              <DialogDescription>
                {editingQuestion ? 'Update the question details' : 'Create a new question for this exam'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <RadioGroup
                  value={questionForm.question_type}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, question_type: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mcq" id="mcq" />
                    <Label htmlFor="mcq" className="cursor-pointer">Multiple Choice</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="short_answer" id="short_answer" />
                    <Label htmlFor="short_answer" className="cursor-pointer">Short Answer</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question_text">Question *</Label>
                <Textarea
                  id="question_text"
                  placeholder="Enter your question..."
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  rows={3}
                />
              </div>

              {questionForm.question_type === 'mcq' && (
                <div className="space-y-2">
                  <Label>Options *</Label>
                  {questionForm.options.map((option, index) => (
                    <Input
                      key={index}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...questionForm.options];
                        newOptions[index] = e.target.value;
                        setQuestionForm({ ...questionForm, options: newOptions });
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="correct_answer">Correct Answer *</Label>
                {questionForm.question_type === 'mcq' ? (
                  <RadioGroup
                    value={questionForm.correct_answer}
                    onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                    className="space-y-2"
                  >
                    {questionForm.options.filter(o => o.trim()).map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`correct-${index}`} />
                        <Label htmlFor={`correct-${index}`} className="cursor-pointer">
                          {String.fromCharCode(65 + index)}. {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input
                    id="correct_answer"
                    placeholder="Enter the correct answer..."
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="marks">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  min={1}
                  max={100}
                  value={questionForm.marks}
                  onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveQuestion} disabled={savingQuestion}>
                {savingQuestion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingQuestion ? 'Update' : 'Add'} Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Question Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Question</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this question? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteQuestion}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
