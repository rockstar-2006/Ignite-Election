'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { ADMIN_EMAILS, parseSemesterFromEmail } from '@/lib/constants';

interface AuthContextType {
  user: any;
  loading: boolean;
  isAdmin: boolean;
  semester: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [semester, setSemester] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      setIsAdmin(ADMIN_EMAILS.includes(session.user.email));
      setSemester(parseSemesterFromEmail(session.user.email));
    } else {
      setIsAdmin(false);
      setSemester(null);
    }
  }, [session]);

  const loginWithGoogle = async () => {
    // Professional approach: avoids all browser blocks
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  const logout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <AuthContext.Provider value={{ 
      user: session?.user || null, 
      loading: status === "loading", 
      isAdmin, 
      semester, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
