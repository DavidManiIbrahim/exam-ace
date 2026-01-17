import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'teacher' | 'student' | 'admin' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'teacher' | 'student' | 'admin') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      return data?.role as UserRole;
    } catch (error) {
      console.error('Error fetching role:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async (currSession: Session | null) => {
      if (!mounted) return;

      setSession(currSession);
      const currUser = currSession?.user ?? null;
      setUser(currUser);

      if (currUser) {
        // If role is already in metadata, use it (speed boost)
        const metadataRole = currUser.app_metadata?.role as UserRole;
        if (metadataRole) {
          setRole(metadataRole);
          setLoading(false);
        } else {
          // Fallback to table fetch
          const userRole = await fetchUserRole(currUser.id);
          if (mounted) {
            setRole(userRole);
            setLoading(false);
          }
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    };

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        initializeAuth(session);
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeAuth(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, userRole: 'teacher' | 'student' | 'admin') => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: userRole,
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        setRole(userRole);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}