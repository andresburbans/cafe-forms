export default function OfflinePage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', textAlign: 'center', padding: '2rem',
      fontFamily: 'Inter, sans-serif', color: '#f0ece8',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sin conexión</h1>
      <p style={{ color: '#9a9490', maxWidth: '320px' }}>
        Esta página no está disponible offline. Vuelve al inicio para seguir usando la app.
      </p>
      <a href="/" style={{
        marginTop: '1.5rem', padding: '0.5rem 1.5rem',
        background: 'linear-gradient(135deg, #c8956c, #a07050)',
        color: '#0f0f0f', borderRadius: '10px', fontWeight: 600,
        textDecoration: 'none',
      }}>
        Ir al Inicio
      </a>
    </div>
  );
}
