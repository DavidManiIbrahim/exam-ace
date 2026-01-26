import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

// Lazy load all page components
const Auth = lazy(() => import("./pages/Auth"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminTeachers = lazy(() => import("./pages/admin/AdminTeachers"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminExams = lazy(() => import("./pages/admin/AdminExams"));
const AdminResults = lazy(() => import("./pages/admin/AdminResults"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminMetadata = lazy(() => import("./pages/admin/AdminMetadata"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const ExamsList = lazy(() => import("./pages/teacher/ExamsList"));
const CreateExam = lazy(() => import("./pages/teacher/CreateExam"));
const ExamDetails = lazy(() => import("./pages/teacher/ExamDetails"));
const StudentsList = lazy(() => import("./pages/teacher/StudentsList"));
const TeacherResults = lazy(() => import("./pages/teacher/TeacherResults"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentExams = lazy(() => import("./pages/student/StudentExams"));
const TakeExam = lazy(() => import("./pages/student/TakeExam"));
const StudentResults = lazy(() => import("./pages/student/StudentResults"));
const ReportCard = lazy(() => import("./pages/student/ReportCard"));
const TeacherReportCards = lazy(() => import("./pages/teacher/ReportCards"));
const Profile = lazy(() => import("./pages/shared/Profile"));
const SubmissionDetail = lazy(() => import("./pages/shared/SubmissionDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium animate-pulse">Loading App...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: ('teacher' | 'student' | 'admin')[] }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!role || !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'teacher') return <Navigate to="/teacher" replace />;
    if (role === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  if (role === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/auth" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<Auth />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeachers /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['admin']}><AdminExams /></ProtectedRoute>} />
      <Route path="/admin/exams/new" element={<ProtectedRoute allowedRoles={['admin']}><CreateExam /></ProtectedRoute>} />
      <Route path="/admin/exams/:id" element={<ProtectedRoute allowedRoles={['admin']}><ExamDetails /></ProtectedRoute>} />
      <Route path="/admin/results" element={<ProtectedRoute allowedRoles={['admin']}><AdminResults /></ProtectedRoute>} />
      <Route path="/admin/results/:id" element={<ProtectedRoute allowedRoles={['admin']}><SubmissionDetail /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/metadata" element={<ProtectedRoute allowedRoles={['admin']}><AdminMetadata /></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/exams" element={<ProtectedRoute allowedRoles={['teacher']}><ExamsList /></ProtectedRoute>} />
      <Route path="/teacher/exams/new" element={<ProtectedRoute allowedRoles={['teacher']}><CreateExam /></ProtectedRoute>} />
      <Route path="/teacher/exams/:id" element={<ProtectedRoute allowedRoles={['teacher']}><ExamDetails /></ProtectedRoute>} />
      <Route path="/teacher/exams/:id/edit" element={<ProtectedRoute allowedRoles={['teacher']}><CreateExam /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><StudentsList /></ProtectedRoute>} />
      <Route path="/teacher/results" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherResults /></ProtectedRoute>} />
      <Route path="/teacher/report-cards" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherReportCards /></ProtectedRoute>} />
      <Route path="/teacher/results/:id" element={<ProtectedRoute allowedRoles={['teacher']}><SubmissionDetail /></ProtectedRoute>} />

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute allowedRoles={['student']}><StudentExams /></ProtectedRoute>} />
      <Route path="/student/exams/:id/take" element={<ProtectedRoute allowedRoles={['student']}><TakeExam /></ProtectedRoute>} />
      <Route path="/student/results" element={<ProtectedRoute allowedRoles={['student']}><StudentResults /></ProtectedRoute>} />
      <Route path="/student/results/:id" element={<ProtectedRoute allowedRoles={['student']}><SubmissionDetail /></ProtectedRoute>} />
      <Route path="/student/report-card" element={<ProtectedRoute allowedRoles={['student']}><ReportCard /></ProtectedRoute>} />

      {/* Shared routes */}
      <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><Profile /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 400);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingPage />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;