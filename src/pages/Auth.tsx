import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, BookOpen, Users, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');

export default function Auth() {
  const navigate = useNavigate();
  const { user, role, signUp, signIn, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'teacher' | 'student' | 'admin'>('student');

  useEffect(() => {
    if (user && role) {
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      nameSchema.parse(signupName);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole);
    setIsLoading(false);

    if (error) {
      const errorMessage = error.message.includes('already registered')
        ? 'This email is already registered. Please sign in instead.'
        : error.message;

      toast({
        title: 'Sign Up Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created',
        description: 'Welcome! You are now signed in.',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2aDZ2Nmg2di02aC02em0tNiA2djZoNnYtNmgtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <GraduationCap className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">ExamHub</h1>
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Modern Exam Management<br />for Modern Education
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-12 max-w-md">
            Create, manage, and take exams with ease. A complete solution for educators and students.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Easy Exam Creation</h3>
                <p className="text-sm text-primary-foreground/70">Create MCQ and written exams in minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Student Management</h3>
                <p className="text-sm text-primary-foreground/70">Track progress and view detailed results</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 gradient-primary rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">ExamHub</h1>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>I am a</Label>
                      <RadioGroup
                        value={signupRole}
                        onValueChange={(value) => setSignupRole(value as 'teacher' | 'student' | 'admin')}
                        className="grid grid-cols-3 gap-2"
                      >
                        <div>
                          <RadioGroupItem
                            value="student"
                            id="student"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="student"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                          >
                            <BookOpen className="mb-1 h-4 w-4" />
                            <span className="text-xs font-medium">Student</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="teacher"
                            id="teacher"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="teacher"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                          >
                            <GraduationCap className="mb-1 h-4 w-4" />
                            <span className="text-xs font-medium">Teacher</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="admin"
                            id="admin"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="admin"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                          >
                            <Shield className="mb-1 h-4 w-4" />
                            <span className="text-xs font-medium">Admin</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}