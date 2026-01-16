import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Users, Trophy, ArrowRight } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 gradient-primary rounded-lg"><GraduationCap className="h-5 w-5 text-primary-foreground" /></div>
            <span className="text-xl font-bold">ExamHub</span>
          </div>
          <Button asChild><Link to="/auth">Get Started<ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
        </div>
      </header>

      <main>
        <section className="gradient-hero py-24 sm:py-32">
          <div className="container mx-auto px-4 text-center text-primary-foreground">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">Modern Exam Management<br />for Modern Education</h1>
            <p className="text-lg sm:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">Create, manage, and take exams with ease. A complete solution for educators and students with auto-grading, timers, and instant results.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild><Link to="/auth">Start as Teacher<GraduationCap className="h-5 w-5 ml-2" /></Link></Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild><Link to="/auth">Join as Student<BookOpen className="h-5 w-5 ml-2" /></Link></Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { icon: BookOpen, title: 'Easy Exam Creation', desc: 'Create MCQ and written exams in minutes with our intuitive editor.' },
                { icon: Users, title: 'Student Management', desc: 'Track student progress and manage submissions effortlessly.' },
                { icon: Trophy, title: 'Instant Results', desc: 'Auto-grade MCQ exams and publish results with one click.' },
              ].map((f, i) => (
                <div key={i} className="exam-card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6"><f.icon className="h-8 w-8 text-primary" /></div>
                  <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 ExamHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
