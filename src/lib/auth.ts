'use client';
import { createContext, useContext } from 'react';

// ── Types ──────────────────────────────────────────
export type UserRole = 'particular' | 'encuestador';

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  surveyorId: number | null;
  surveyorName: string | null;
  surveyorEmail: string | null;
}

export interface AuthContextType extends AuthState {
  login: (surveyorId: number, surveyorName: string, email: string) => void;
  logout: () => void;
}

// ── Persistence helpers (localStorage) ─────────────
const AUTH_KEY = 'cafeproy_auth';

export function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, role: 'particular', surveyorId: null, surveyorName: null, surveyorEmail: null };
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.isAuthenticated) return parsed;
    }
  } catch { /* ignore */ }
  return { isAuthenticated: false, role: 'particular', surveyorId: null, surveyorName: null, surveyorEmail: null };
}

export function persistAuth(state: AuthState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
}

// ── Password hashing ──────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Context ────────────────────────────────────────
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  role: 'particular',
  surveyorId: null,
  surveyorName: null,
  surveyorEmail: null,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
