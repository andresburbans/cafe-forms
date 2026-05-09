'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, type Finca } from '@/lib/db';

export default function FincasPage() {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [filter, setFilter] = useState<'todas' | 'completo' | 'borrador'>('todas');

  useEffect(() => {
    loadFincas();
  }, [filter]);

  async function loadFincas() {
    let query = db.fincas.orderBy('createdAt').reverse();
    const all = await query.toArray();
    setFincas(filter === 'todas' ? all : all.filter((f) => f.status === filter));
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Fincas registradas</h1>
        <p className="page-subtitle">{fincas.length} finca{fincas.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="check-group mb-lg">
        {(['todas', 'completo', 'borrador'] as const).map((f) => (
          <button key={f} className={`check-item ${filter === f ? 'selected' : ''}`} onClick={() => setFilter(f)} style={{ border: 'none', cursor: 'pointer' }}>
            {f === 'todas' ? 'Todas' : f === 'completo' ? 'Completas' : 'Borradores'}
          </button>
        ))}
      </div>

      {fincas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <div className="empty-title">Sin fincas</div>
          <div className="empty-desc">No hay fincas con este filtro</div>
          <Link href="/encuesta/nueva" className="btn btn-primary">+ Nueva encuesta</Link>
        </div>
      ) : (
        <div className="farm-list">
          {fincas.map((farm) => (
            <Link href={`/fincas/ver?id=${farm.id}`} className="farm-item" key={farm.id}>
              <div className="farm-info">
                <div className="farm-name">{farm.nombreFinca || 'Sin nombre'}</div>
                <div className="farm-meta">{farm.nombreCaficultor} · {farm.municipio}</div>
                <div className="farm-meta">📅 {farm.fechaVisita} · Placa: {farm.idFincaUnico || 'N/A'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${farm.status === 'completo' ? 'badge--complete' : 'badge--draft'}`}>
                  {farm.status === 'completo' ? 'Completa' : 'Borrador'}
                </span>
                <span className="farm-arrow">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
