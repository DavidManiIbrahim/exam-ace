import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Save } from 'lucide-react';

interface ProfileData {
    full_name: string;
    email: string;
    student_id: string | null;
    class: string | null;
}

export default function Profile() {
    const { user, role } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<ProfileData>({
        full_name: '',
        email: '',
        student_id: '',
        class: '',
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user!.id)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    email: data.email || user!.email || '',
                    student_id: data.student_id || '',
                    class: data.class || '',
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast({
                title: 'Error',
                description: 'Failed to load profile data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            const updates: any = {
                full_name: formData.full_name,
                updated_at: new Date().toISOString(),
            };

            if (role === 'student') {
                updates.student_id = formData.student_id;
                updates.class = formData.class;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('user_id', user.id);

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Profile updated successfully',
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                title: 'Error',
                description: 'Failed to update profile',
                variant: 'destructive',
            });
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

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
                    <p className="text-muted-foreground">Manage your personal information</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Profile Details</CardTitle>
                        <CardDescription>
                            Update your profile information here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="pl-10 bg-muted"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                />
                            </div>

                            {role === 'student' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="student_id">Student ID</Label>
                                        <Input
                                            id="student_id"
                                            name="student_id"
                                            value={formData.student_id || ''}
                                            onChange={handleChange}
                                            placeholder="e.g. STD-001"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="class">Class</Label>
                                        <Input
                                            id="class"
                                            name="class"
                                            value={formData.class || ''}
                                            onChange={handleChange}
                                            placeholder="e.g. Grade 10"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
