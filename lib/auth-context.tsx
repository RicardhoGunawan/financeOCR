'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, type UserProfile } from './supabase';

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Memoize fetch profile function
  const fetchProfile = useCallback(async (authUser: User) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle(); // ✅ Gunakan maybeSingle() untuk performa lebih baik

      if (error) {
        console.warn('Error fetching profile:', error.message);
        setProfile(null);
        return null;
      }

      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  }, []);

  // ✅ Optimasi getOrWaitForProfile dengan exponential backoff
  const getOrWaitForProfile = useCallback(async (authUser: User, maxRetries = 4) => {
    // Coba fetch langsung dulu
    const existingProfile = await fetchProfile(authUser);
    if (existingProfile) return existingProfile;

    // Retry dengan exponential backoff: 200ms, 400ms, 800ms
    for (let i = 0; i < maxRetries; i++) {
      const delay = Math.min(200 * Math.pow(2, i), 1000); // Max 1 detik
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const profile = await fetchProfile(authUser);
      if (profile) return profile;
    }

    // Fallback: create profile manually
    const fullName = authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'User';

    try {
      const { data: newProfile, error } = await supabase
        .from('user_profiles')
        .upsert({ // ✅ Gunakan upsert untuk menghindari conflict
          user_id: authUser.id,
          full_name: fullName,
          avatar_url: authUser.user_metadata?.avatar_url || null,
          currency: 'Rp',
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (!error && newProfile) {
        setProfile(newProfile);
        return newProfile;
      }
    } catch (error) {
      console.error('Failed to create profile:', error);
    }

    return null;
  }, [fetchProfile]);

  // ✅ Memoize refresh function
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  // ✅ Optimasi auth initialization
  useEffect(() => {
    let mounted = true;
    let profileFetchPromise: Promise<any> | null = null;

    const initAuth = async () => {
      try {
        // ✅ Parallel fetch: ambil session dan setup listener bersamaan
        const [{ data: { session } }] = await Promise.all([
          supabase.auth.getSession(),
        ]);
        
        if (!mounted) return;
        
        const authUser = session?.user ?? null;
        setUser(authUser);

        if (authUser) {
          // ✅ Fetch profile tanpa blocking loading state
          profileFetchPromise = getOrWaitForProfile(authUser);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          // ✅ Set loading false immediately, profile fetch berjalan di background
          setLoading(false);
        }
      }
    };

    initAuth();

    // ✅ Setup auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        const authUser = session?.user ?? null;
        setUser(authUser);

        // ✅ Optimasi: hanya fetch profile untuk event tertentu
        if (authUser && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) {
          getOrWaitForProfile(authUser);
        } else if (!authUser) {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [getOrWaitForProfile]);

  // ✅ Memoize sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  // ✅ Optimasi sign up dengan better error handling
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // ✅ Pass metadata saat signup
          }
        }
      });

      if (error) return { error };

      // ✅ Profile akan dibuat otomatis oleh trigger
      // Hanya create manual jika trigger gagal
      if (data.user) {
        setTimeout(() => {
          getOrWaitForProfile(data.user!);
        }, 500); // ✅ Beri waktu trigger untuk berjalan
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [getOrWaitForProfile]);

  // ✅ Memoize Google sign in
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
  }, []);

  // ✅ Memoize sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  // ✅ Memoize context value untuk prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }), [user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
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