'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useAuth, hashPassword } from '@/lib/auth';
import { Toast, useToast } from '@/components/Toast';

export default function DarkPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const { toast, showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Ingresa email y contraseña');
      return;
    }
    setLoading(true);

    const surveyor = await db.surveyors
      .where('email')
      .equals(email.trim().toLowerCase())
      .first();

    if (!surveyor || !surveyor.id) {
      showToast('Credenciales inválidas');
      setLoading(false);
      return;
    }

    const hash = await hashPassword(password);
    if (hash !== surveyor.passwordHash) {
      showToast('Credenciales inválidas');
      setLoading(false);
      return;
    }

    login(surveyor.id, surveyor.nombre, surveyor.email);
    showToast(`Bienvenido, ${surveyor.nombre}`);
    setTimeout(() => router.push('/'), 500);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">CaféForms</h1>
          <p className="auth-subtitle">Acceso interno</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label className="auth-label" htmlFor="dark-email">Correo electrónico</label>
            <input
              id="dark-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@organizacion.com"
              autoFocus
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="auth-label" htmlFor="dark-pwd">Contraseña</label>
            <input
              id="dark-pwd"
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <button
          className="auth-back-link"
          onClick={() => router.push('/')}
        >
          Volver al inicio
        </button>
      </div>
      {toast && <Toast message={toast} />}
    </div>
  );
}
