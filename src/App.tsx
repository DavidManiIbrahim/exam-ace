import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import ExamsList from "./pages/teacher/ExamsList";
import CreateExam from "./pages/teacher/CreateExam";
import ExamDetails from "./pages/teacher/ExamDetails";
import StudentsList from "./pages/teacher/StudentsList";
import TeacherResults from "./pages/teacher/TeacherResults";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentExams from "./pages/student/StudentExams";
import TakeExam from "./pages/student/TakeExam";
import StudentResults from "./pages/student/StudentResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole: 'teacher' | 'student' }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== allowedRole) return <Navigate to={role === 'teacher' ? '/teacher' : '/student'} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/exams" element={<ProtectedRoute allowedRole="teacher"><ExamsList /></ProtectedRoute>} />
      <Route path="/teacher/exams/new" element={<ProtectedRoute allowedRole="teacher"><CreateExam /></ProtectedRoute>} />
      <Route path="/teacher/exams/:id" element={<ProtectedRoute allowedRole="teacher"><ExamDetails /></ProtectedRoute>} />
      <Route path="/teacher/exams/:id/edit" element={<ProtectedRoute allowedRole="teacher"><CreateExam /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRole="teacher"><StudentsList /></ProtectedRoute>} />
      <Route path="/teacher/results" element={<ProtectedRoute allowedRole="teacher"><TeacherResults /></ProtectedRoute>} />
      <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute allowedRole="student"><StudentExams /></ProtectedRoute>} />
      <Route path="/student/exams/:id/take" element={<ProtectedRoute allowedRole="student"><TakeExam /></ProtectedRoute>} />
      <Route path="/student/results" element={<ProtectedRoute allowedRole="student"><StudentResults /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
