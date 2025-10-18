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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>; // 👈 1. TAMBAHKAN FUNGSI BARU INI
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
      setProfile(null); // Set null jika error
      return null;
    }
    
    setProfile(userProfile || null); // 👈 2. PASTIKAN STATE DI-UPDATE
    return userProfile;
  };

  // 👈 3. BUAT FUNGSI REFRESH YANG BISA DIAKSES PUBLIK
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // ... (kode initAuth Anda)
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      
      setUser(authUser);

      if (authUser) {
        await fetchProfile(authUser); // Panggil fetchProfile
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
          await fetchProfile(authUser); // Panggil fetchProfile
        } else {
          setProfile(null);
        }
        
        if (loading) setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loading]); // Hapus 'loading' dari dependensi jika menyebabkan loop

  const signIn = async (email: string, password: string) => {
    // ... (kode signIn Anda)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // ... (kode signUp Anda)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error && data.user) {
      const { data: newProfile, error: profileError } = await supabase.from('user_profiles').insert({
        user_id: data.user.id,
        full_name: fullName,
        currency: 'Rp',
      }).select().single();
      
      if (!profileError) {
         setProfile(newProfile); 
      }
    }

    return { error };
  };

  const signOut = async () => {
    // ... (kode signOut Anda)
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
        signOut, 
        refreshProfile // 👈 4. MASUKKAN FUNGSI KE PROVIDER
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