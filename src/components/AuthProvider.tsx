'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { AuthContext, type AuthState, getStoredAuth, persistAuth, clearAuth } from '@/lib/auth';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    role: 'particular',
    surveyorId: null,
    surveyorName: null,
    surveyorEmail: null,
  });
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredAuth();
    setAuthState(stored);
    setMounted(true);
  }, []);

  const login = useCallback((surveyorId: number, surveyorName: string, email: string) => {
    const newState: AuthState = {
      isAuthenticated: true,
      role: 'encuestador',
      surveyorId,
      surveyorName,
      surveyorEmail: email,
    };
    setAuthState(newState);
    persistAuth(newState);
  }, []);

  const logout = useCallback(() => {
    const newState: AuthState = {
      isAuthenticated: false,
      role: 'particular',
      surveyorId: null,
      surveyorName: null,
      surveyorEmail: null,
    };
    setAuthState(newState);
    clearAuth();
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
