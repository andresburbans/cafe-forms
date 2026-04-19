'use client';

import { useState } from 'react';
import { useSurveyor } from '@/hooks/useSurveyor';
import { Toast, useToast } from '@/components/Toast';

export default function PerfilPage() {
  const { surveyor, loading, saveSurveyor } = useSurveyor();
  const { toast, showToast } = useToast();
  const [form, setForm] = useState({ nombre: '', documento: '', telefono: '', organizacion: '' });
  const [initialized, setInitialized] = useState(false);

  if (!loading && surveyor && !initialized) {
    setForm({ nombre: surveyor.nombre, documento: surveyor.documento, telefono: surveyor.telefono, organizacion: surveyor.organizacion });
    setInitialized(true);
  }
  if (!loading && !surveyor && !initialized) setInitialized(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { showToast('Nombre requerido'); return; }
    await saveSurveyor(form);
    showToast('Perfil guardado');
  };

  if (loading) return <div className="text-center mt-lg">Cargando...</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Perfil del encuestador</h1>
        <p className="page-subtitle">Datos locales. Se asocian a cada encuesta.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label className="form-label" htmlFor="prof-nombre">Nombre completo *</label>
            <input id="prof-nombre" className="form-input" type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Juan Pérez" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prof-doc">Documento / Cédula</label>
            <input id="prof-doc" className="form-input" type="text" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="1234567890" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prof-tel">Teléfono</label>
            <input id="prof-tel" className="form-input" type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+57 300 000 0000" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prof-org">Organización</label>
            <input id="prof-org" className="form-input" type="text" value={form.organizacion} onChange={(e) => setForm({ ...form, organizacion: e.target.value })} placeholder="Cooperativa / Empresa" />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" id="btn-save-profile">Guardar perfil</button>
        </div>
      </form>
      {surveyor && (
        <div className="card mt-lg text-center">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Perfil creado: {surveyor.createdAt.toLocaleDateString('es-CO')}
          </div>
        </div>
      )}
      {toast && <Toast message={toast} />}
    </>
  );
}
