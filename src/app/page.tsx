'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, type Finca } from '@/lib/db';
import { useSurveyor } from '@/hooks/useSurveyor';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function HomePage() {
  const { surveyor, loading } = useSurveyor();
  const isOnline = useOnlineStatus();
  const [stats, setStats] = useState({ total: 0, completas: 0, borradores: 0, fotos: 0 });
  const [recentFarms, setRecentFarms] = useState<Finca[]>([]);

  useEffect(() => {
    async function loadStats() {
      const total = await db.fincas.count();
      const completas = await db.fincas.where('status').equals('completo').count();
      const borradores = total - completas;
      const fotos = await db.fotos.count();
      setStats({ total, completas, borradores, fotos });

      const recent = await db.fincas
        .orderBy('createdAt')
        .reverse()
        .limit(3)
        .toArray();
      setRecentFarms(recent);
    }
    loadStats();
  }, []);

  if (loading) return <div className="app-container text-center mt-lg">Cargando...</div>;

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">☕ CaféForms</h1>
        <p className="page-subtitle">
          {surveyor
            ? `Bienvenido, ${surveyor.nombre}`
            : 'Configura tu perfil para comenzar'}
        </p>
        <div className="mt-md">
          <span className={`badge ${isOnline ? 'badge--online' : 'badge--offline'}`}>
            {isOnline ? '● En línea' : '● Sin conexión'}
          </span>
        </div>
      </div>

      {/* No profile warning */}
      {!surveyor && (
        <div className="offline-banner mb-lg" style={{ borderColor: 'rgba(200,149,108,0.3)', background: 'rgba(200,149,108,0.1)', color: 'var(--color-accent)' }}>
          Configura tu perfil de encuestador antes de iniciar
          <Link href="/perfil" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 12px' }}>
            Configurar
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Fincas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completas}</div>
          <div className="stat-label">Completas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.borradores}</div>
          <div className="stat-label">Borradores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.fotos}</div>
          <div className="stat-label">Fotos</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-lg">
        <Link href="/encuesta/nueva" className="btn btn-primary btn-block btn-lg" id="btn-new-survey">
          Nueva encuesta de finca
        </Link>
      </div>

      {/* Recent Farms */}
      {recentFarms.length > 0 && (
        <>
          <div className="flex-between mb-md">
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recientes</h2>
            <Link href="/fincas" style={{ fontSize: '0.8rem' }}>Ver todas →</Link>
          </div>
          <div className="farm-list">
            {recentFarms.map((farm) => (
              <Link href={`/fincas/${farm.id}`} className="farm-item" key={farm.id}>
                <div className="farm-info">
                  <div className="farm-name">{farm.nombreFinca || 'Sin nombre'}</div>
                  <div className="farm-meta">
                    {farm.nombreCaficultor} · {farm.municipio}
                  </div>
                  <div className="farm-meta">{farm.fechaVisita}</div>
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
        </>
      )}

      {recentFarms.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <div className="empty-title">Sin fincas registradas</div>
          <div className="empty-desc">Comienza creando tu primera encuesta de finca cafetera</div>
        </div>
      )}
    </>
  );
}
