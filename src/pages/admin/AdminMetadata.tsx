import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Settings2 } from 'lucide-react';

export default function AdminMetadata() {
    const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
    const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: classesData } = await supabase.from('classes').select('*').order('name');
        const { data: subjectsData } = await supabase.from('subjects').select('*').order('name');
        if (classesData) setClasses(classesData);
        if (subjectsData) setSubjects(subjectsData);
    };

    const handleAddClass = async () => {
        if (!newClassName.trim()) return;
        setIsLoading(true);
        const { error } = await supabase.from('classes').insert({ name: newClassName.trim() });
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Class added successfully' });
            setNewClassName('');
            fetchData();
        }
        setIsLoading(false);
    };

    const handleAddSubject = async () => {
        if (!newSubjectName.trim()) return;
        setIsLoading(true);
        const { error } = await supabase.from('subjects').insert({ name: newSubjectName.trim() });
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Subject added successfully' });
            setNewSubjectName('');
            fetchData();
        }
        setIsLoading(false);
    };

    const handleDelete = async (table: 'classes' | 'subjects', id: string) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Deleted successfully' });
            fetchData();
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings2 className="h-6 w-6 text-primary" />
                        Core Settings
                    </h1>
                    <p className="text-muted-foreground">Manage classes and subjects for the institution</p>
                </div>

                <Tabs defaultValue="classes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="classes">Classes / Departments</TabsTrigger>
                        <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    </TabsList>

                    <TabsContent value="classes" className="mt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="exam-card">
                                <CardHeader>
                                    <CardTitle>Add New Class</CardTitle>
                                    <CardDescription>Enter the name of the new class or department</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="className">Class Name</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="className"
                                                placeholder="e.g. Science 101"
                                                value={newClassName}
                                                onChange={(e) => setNewClassName(e.target.value)}
                                            />
                                            <Button onClick={handleAddClass} disabled={isLoading}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="exam-card">
                                <CardHeader>
                                    <CardTitle>Current Classes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {classes.map((c) => (
                                            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                                                <span className="font-medium">{c.name}</span>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete('classes', c.id)} className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {classes.length === 0 && <p className="text-center text-muted-foreground py-4">No classes added yet</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="subjects" className="mt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="exam-card">
                                <CardHeader>
                                    <CardTitle>Add New Subject</CardTitle>
                                    <CardDescription>Enter the name of the new subject</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="subjectName">Subject Name</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="subjectName"
                                                placeholder="e.g. Physics"
                                                value={newSubjectName}
                                                onChange={(e) => setNewSubjectName(e.target.value)}
                                            />
                                            <Button onClick={handleAddSubject} disabled={isLoading}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="exam-card">
                                <CardHeader>
                                    <CardTitle>Current Subjects</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {subjects.map((s) => (
                                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                                                <span className="font-medium">{s.name}</span>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete('subjects', s.id)} className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {subjects.length === 0 && <p className="text-center text-muted-foreground py-4">No subjects added yet</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
