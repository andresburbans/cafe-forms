'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, type Finca } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { HABEAS_DATA_TEXT } from '@/lib/constants';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, surveyorName, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [stats, setStats] = useState({ total: 0, completas: 0, borradores: 0, fotos: 0 });
  const [recentFarms, setRecentFarms] = useState<Finca[]>([]);
  const [activeCredit, setActiveCredit] = useState<{ name: string, url: string, photoUrl: string } | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (isAuthenticated) loadStats();
  }, [isAuthenticated]);

  async function loadStats() {
    const total = await db.fincas.count();
    const completas = await db.fincas.where('status').equals('completo').count();
    const borradores = total - completas;
    const fotos = await db.fotos.count();
    setStats({ total, completas, borradores, fotos });
    const recent = await db.fincas.orderBy('createdAt').reverse().limit(3).toArray();
    setRecentFarms(recent);
  }

  // ─── Encuestador Dashboard ───
  if (isAuthenticated) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">CaféForms</h1>
          <p className="page-subtitle">Bienvenido, {surveyorName}</p>
          <div className="mt-md" style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <span className={`badge ${isOnline ? 'badge--online' : 'badge--offline'}`}>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
            <span className="badge" style={{ background: 'rgba(200,149,108,0.15)', color: 'var(--color-accent)' }}>
              Encuestador
            </span>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Fincas</div></div>
          <div className="stat-card"><div className="stat-value">{stats.completas}</div><div className="stat-label">Completas</div></div>
          <div className="stat-card"><div className="stat-value">{stats.borradores}</div><div className="stat-label">Borradores</div></div>
          <div className="stat-card"><div className="stat-value">{stats.fotos}</div><div className="stat-label">Fotos</div></div>
        </div>
        <div className="mb-lg">
          <Link href="/encuesta/nueva" className="btn btn-primary btn-block btn-lg" id="btn-new-survey">
            Nueva encuesta de finca
          </Link>
        </div>
        {recentFarms.length > 0 && (
          <>
            <div className="flex-between mb-md">
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recientes</h2>
              <Link href="/fincas" style={{ fontSize: '0.8rem' }}>Ver todas</Link>
            </div>
            <div className="farm-list">
              {recentFarms.map((farm) => (
                <Link href={`/fincas/ver?id=${farm.id}`} className="farm-item" key={farm.id}>
                  <div className="farm-info">
                    <div className="farm-name">{farm.nombreFinca || 'Sin nombre'}</div>
                    <div className="farm-meta">{farm.nombreCaficultor} · {farm.municipio}</div>
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
            <div className="empty-title">Sin fincas registradas</div>
            <div className="empty-desc">Comienza creando tu primera encuesta de finca cafetera</div>
          </div>
        )}
        <div className="mt-lg text-center">
          <button className="btn btn-secondary" onClick={logout} style={{ opacity: 0.7, fontSize: '0.8rem' }}>
            Cerrar sesión
          </button>
        </div>
      </>
    );
  }

  // ─── Landing Page (Caficultor / Sin Auth) ───

  return (
    <div className="home-landing">

      {/* ═══ HERO ═══ */}
      <section className="home-hero">
        <div className="home-hero-bg" style={{ pointerEvents: 'none' }}>
          <svg viewBox="0 0 1440 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" shapeRendering="optimizeSpeed">
            <path fill="#f5f1e8" d="M0,600 L1440,600 L1440,300 Q1080,200 720,350 Q360,500 0,250 Z" />
            <path fill="#eaddcc" d="M0,600 L1440,600 L1440,400 Q1080,300 720,450 Q360,600 0,400 Z" />
          </svg>
        </div>
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Conectando nuestro café
          </h1>
          <p className="home-hero-sub">
            El campo colombiano alberga miles de fincas que producen algunos de los mejores cafés del mundo. Estamos construyendo una plataforma para conectar directamente a estos productores con compradores de especialidad alrededor del mundo.
          </p>
          <button
            className="home-btn-primary "
            onClick={() => router.push('/encuesta/nueva')}
            id="cta-comenzar-registro"
            style={{ marginBottom: '2rem' }}
          >
            Quiero participar
            <span className="home-btn-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
          </button>

          <div
            className="home-organic-img-container "
            style={{ marginTop: '3rem' }}
            onClick={() => setActiveCredit({
              name: "Reiseuhu",
              url: "https://unsplash.com/es/@reiseuhu?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText",
              photoUrl: "https://unsplash.com/es/fotos/fotografia-aerea-de-bosques-2GrRlrLReQc"
            })}
          >
            <img src="https://images.unsplash.com/photo-1559556064-4161b6be179b?q=80&w=800&auto=format&fit=crop" alt="Bosque aéreo" className="home-organic-img blob-mask-1" />
          </div>
        </div>
      </section>

      {/* ═══ EL PROBLEMA (Texto Izquierda, Foto Derecha) ═══ */}
      <section className="home-section home-section--crema-dark">
        <div className="home-container">
          <div className="home-grid-2">
            <div className=" " style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <h2 className="home-title-large">La cadena que rompe al Caficultor</h2>
              <p className="home-text-body">
                En Colombia, millones de pequeños productores reciben solo una mínima parte del valor que generan. Los intermediarios no solo diluyen las ganancias, sino que borran la identidad de cada cosecha, dejando al caficultor en la sombra.
              </p>
              <p className="home-text-body">
                La excelencia de nuestro café, desde su perfil de taza único hasta el esfuerzo humano en cada grano, rara vez llega a ser valorada por quienes estarían dispuestos a pagar su precio real.
              </p>
            </div>

            <div
              className="home-organic-img-container "
              style={{ transitionDelay: '200ms' }}
              onClick={() => setActiveCredit({
                name: "Shelby Murphy Figueroa",
                url: "https://unsplash.com/es/@shelbyfigueroa?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText",
                photoUrl: "https://unsplash.com/es/fotos/una-persona-recogiendo-bayas-de-un-arbusto-en-un-bosque-KU7C4W330CY"
              })}
            >
              <img src="https://images.unsplash.com/photo-1722962884239-ae1583767578?q=80&w=800&auto=format&fit=crop" alt="Caficultor recolectando bayas" className="home-organic-img blob-mask-2" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ORGANIC DIVIDER: Cream → Green ═══ */}
      <div className="custom-shape-divider-bottom" style={{ background: '#eaddcc' }}>
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C73.86,30.34,166.4,49.88,236.4,56.44Z" className="shape-fill-green"></path>
        </svg>
      </div>

      {/* ═══ LA SOLUCION (Foto Izquierda, Texto Derecha) ═══ */}
      <section className="home-section home-section--green" style={{ marginTop: '-1px' }}>
        <div className="home-container">
          <div className="home-grid-2" style={{ alignItems: 'center' }}>
            <div className=" " style={{ transitionDelay: '200ms', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <h2 className="home-title-large">La finca puede ganar</h2>
              <p className="home-text-body" style={{ fontSize: '1.25rem' }}>
                Trabajaremos por un comercio de café más justo y transparente dándole a cada productor una identidad digital.
                Un espacio para mostrar su producción, sus certificaciones, su perfil de taza y su historia.
              </p>
              <p className="home-text-body">
                A través de nuestra plataforma, los compradores no descubren solo un café, sino la tierra, la altitud y las manos detrás de cada cosecha.
              </p>
            </div>

            <div
              className="home-organic-img-container "
              onClick={() => setActiveCredit({
                name: "Jojo Yuen",
                url: "https://unsplash.com/es/@jojoyuen?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText",
                photoUrl: "https://unsplash.com/es/fotos/taza-de-te-de-ceramica-blanca-en-platillo-junto-a-flores-rojas-E5yBVJzQx3I"
              })}
            >
              <img src="https://images.unsplash.com/photo-1607260550778-aa9d29444ce1?q=80&w=800&auto=format&fit=crop" alt="Taza de café con flores" className="home-organic-img blob-mask-3" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LO QUE CONOCERÁ (VARIABLES) ═══ */}
      <section className="home-section" style={{ background: '#2e4a36', paddingTop: 0, marginTop: '-2px' }}>
        <div className="home-container ">
          <h3 className="home-title-medium" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Lo que cada comprador conocerá
          </h3>
          <div className="home-vars-grid">
            {['Perfil de taza', 'Origen y altitud', 'Variables ambientales', 'Certificaciones', 'Capacidad de producción', 'Stock disponible', 'Marca propia del caficultor', 'Trazabilidad'].map((v, i) => (
              <div key={i} className="home-var-chip" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                {v}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ORGANIC DIVIDER: Green → Cream ═══ */}
      <div className="custom-shape-divider-bottom" style={{ background: '#2e4a36' }}>
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" shapeRendering="optimizeSpeed">
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.83C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="shape-fill-cream"></path>
        </svg>
      </div>

      {/* ═══ DATOS QUE IMPORTAN (Texto Izquierda, Foto Derecha) ═══ */}
      <section className="home-section home-section--cream" style={{ marginTop: '-1px' }}>
        <div className="home-container">
          <div className="home-grid-2">
            <div className=" " style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
              <h2 className="home-title-large">Datos que importan</h2>
              <div className="home-stats-grid">
                {[
                  "El café se cultiva en más de 600 municipios de Colombia, pero el reconocimiento real del origen sigue siendo el mayor desafío para el productor.",
                  "Mientras el mercado de especialidad crece exponencialmente, el pequeño productor sigue atrapado en precios de bolsa que no reflejan la calidad de su trabajo.",
                  "Detrás de cada taza de café hay una cadena humana invisible; nuestra misión es que el mundo conozca por fin a quien sembró y cuidó ese fruto.",
                  "Hoy, la trazabilidad no es un lujo, es el requisito indispensable para que el café colombiano de alta gama conquiste los mercados de Europa y Norteamérica."
                ].map((text, i) => (
                  <div key={i} className="home-stat-item " style={{ transitionDelay: `${i * 100}ms` }}>
                    <div className="home-stat-text">{text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="home-organic-img-container "
              style={{ transitionDelay: '300ms' }}
              onClick={() => setActiveCredit({
                name: "Luis Alfredo Gutierrez Leiva",
                url: "https://unsplash.com/es/@thecaronte?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText",
                photoUrl: "https://unsplash.com/es/fotos/un-pequeno-pajaro-amarillo-posado-en-la-rama-de-un-arbol-H0fYN1-Ps5g"
              })}
            >
              <img src="https://images.unsplash.com/photo-1645815607114-316b464950a2?q=80&w=800&auto=format&fit=crop" alt="Pájaro amarillo" className="home-organic-img blob-mask-1" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ORGANIC DIVIDER: Cream → Green ═══ */}
      <div className="custom-shape-divider-bottom" style={{ background: '#FDFBF7' }}>
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C73.86,30.34,166.4,49.88,236.4,56.44Z" className="shape-fill-green"></path>
        </svg>
      </div>

      {/* ═══ MEDIO AMBIENTE Y CAFE (Foto Izquierda, Texto Derecha) ═══ */}
      <section className="home-section home-section--green" style={{ marginTop: '-1px' }}>
        <div className="home-container">
          <div className="home-grid-2" style={{ alignItems: 'center' }}>
            <div className=" " style={{ transitionDelay: '200ms', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
              <h2 className="home-title-large">Medio ambiente y café</h2>
              <p className="home-text-body" style={{ fontSize: '1.15rem' }}>
                La caficultura responsable no solo produce mejores perfiles de taza, sino que protege la biodiversidad local. Al reducir los pesticidas químicos y conservar los bosques nativos, las fincas cafetaleras se convierten en corredores ecológicos vitales.
              </p>
            </div>

            <div
              className="home-organic-img-container "
              onClick={() => setActiveCredit({
                name: "Daniel Restrepo Londoño",
                url: "https://unsplash.com/es/@daniel_restrepolondono?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText",
                photoUrl: "https://unsplash.com/es/fotos/pajaro-marron-y-blanco-posado-en-la-rama-de-un-arbol-durante-el-dia-UrLsHH6eaIY"
              })}
            >
              <img src="https://images.unsplash.com/photo-1583712364117-34ccb03cd66c?q=80&w=800&auto=format&fit=crop" alt="Pájaro en la rama" className="home-organic-img blob-mask-2" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="home-final-cta" style={{ background: '#2e4a36' }}>
        <div className="home-final-cta-card ">
          <h2 className="home-final-cta-title">Tu café tiene historia.<br />El mundo quiere conocerla.</h2>
          <button
            className="home-btn-primary home-btn-secondary"
            onClick={() => router.push('/encuesta/nueva')}
            id="cta-final-llenar-encuesta"
          >
            Quiero participar
            <span className="home-btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </span>
          </button>
          <p className="home-final-cta-micro" style={{ color: 'rgba(255,255,255,0.7)' }}>Solo toma 10 minutos</p>
        </div>
      </section>

      {/* ═══ CREDIT POPUP OVERLAY ═══ */}
      {activeCredit && (
        <div className="credit-popup-overlay" onClick={() => setActiveCredit(null)}>
          <div className="credit-popup-card" onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '1rem', color: '#666' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Créditos de Imagen</h3>
            <p style={{ lineHeight: '1.5', color: '#444' }}>
              Foto de <a href={activeCredit.url} target="_blank" rel="noopener noreferrer">{activeCredit.name}</a> en <a href={activeCredit.photoUrl} target="_blank" rel="noopener noreferrer">Unsplash</a>
            </p>
            <button className="credit-popup-close" onClick={() => setActiveCredit(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="home-footer" style={{ background: '#2e4a36', padding: 'var(--space-2xl) 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="home-container">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xl)' }}>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-xl)', fontSize: '0.85rem' }}>
              <button
                onClick={() => setShowTerms(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s', fontFamily: 'inherit' }}
              >
                Términos y condiciones
              </button>
            </div>

            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
              © 2026 CaféForms. Todos los derechos reservados.
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <a href="https://rumbo3d.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)' }}>Diseñado por</span>
                <img src="/rumbo3d_logo-light.svg" alt="Rumbo3D Logo" style={{ height: '24px', width: 'auto' }} />
              </a>
            </div>

          </div>
        </div>
      </footer>

      {/* Modal Habeas Data */}
      {showTerms && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)' }}>
          <div className="card" style={{ maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', position: 'relative', border: '1px solid var(--color-accent)', textAlign: 'left' }}>
            <h2 style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-md)', fontSize: '1.4rem', letterSpacing: '-0.02em' }}>{HABEAS_DATA_TEXT.title}</h2>
            <div style={{ fontSize: '0.82rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.9)' }}>
              <p style={{ marginBottom: 'var(--space-sm)' }}>{HABEAS_DATA_TEXT.intro}</p>

              {HABEAS_DATA_TEXT.secciones.map((sec, idx) => (
                <div key={idx} style={{ marginTop: 'var(--space-md)' }}>
                  <b style={{ color: 'var(--color-accent)', display: 'block', marginBottom: '4px' }}>{sec.titulo}</b>
                  {sec.texto && <p>{sec.texto}</p>}
                  {sec.items && (
                    <ul style={{ paddingLeft: '1.2rem', margin: '4px 0' }}>
                      {sec.items.map((item, i) => (
                        <li key={i} style={{ marginBottom: '2px' }}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              <p style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 'var(--space-md)', fontWeight: 600 }}>
                {HABEAS_DATA_TEXT.autorizacion}
              </p>
            </div>
            <button className="btn btn-primary mt-lg" style={{ width: '100%' }} onClick={() => setShowTerms(false)}>Entendido y Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

