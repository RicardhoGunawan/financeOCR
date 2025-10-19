'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, type UserProfile } from './supabase';

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<void>; // 👈 Tambahkan ini
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fungsi helper untuk mengambil profil
  const fetchProfile = async (authUser: User) => {
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching profile:', error.message);
      setProfile(null);
      return null;
    }

    setProfile(userProfile || null);
    return userProfile;
  };

  // Fungsi untuk mengambil atau menunggu profil dibuat
  const getOrWaitForProfile = async (authUser: User, retries = 5) => {
    for (let i = 0; i < retries; i++) {
      const profile = await fetchProfile(authUser);
      if (profile) return profile;

      // Tunggu sebentar sebelum retry (karena trigger mungkin belum selesai)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Jika setelah retry masih belum ada, buat manual sebagai fallback
    const fullName = authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'User';

    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authUser.id,
        full_name: fullName,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        currency: 'Rp',
      })
      .select()
      .single();

    if (!profileError && newProfile) {
      setProfile(newProfile);
      return newProfile;
    }

    return null;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;

      setUser(authUser);

      if (authUser) {
        await getOrWaitForProfile(authUser);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);

        if (authUser) {
          await getOrWaitForProfile(authUser);
        } else {
          setProfile(null);
        }

        if (loading) setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error && data.user) {
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          full_name: fullName,
          currency: 'Rp',
        })
        .select()
        .single();

      if (!profileError) {
        setProfile(newProfile);
      }
    }

    return { error };
  };

  // 👈 Fungsi Google Sign-In dengan PKCE
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle, // 👈 Tambahkan ke provider
        signOut,
        refreshProfile
      }}
    >
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