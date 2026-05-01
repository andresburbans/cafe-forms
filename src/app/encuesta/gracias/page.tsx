'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function GraciasPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <div className="gracias-page">
      <div className="gracias-container">
        {/* Decorative Success Icon */}
        <div className="gracias-decoration">
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: 'rgba(74, 222, 128, 0.1)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto',
            border: '2px solid var(--color-success)'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <h1 className="gracias-title">¡Muchas Gracias!</h1>

        <p className="gracias-message">
          Tu información ha sido guardada exitosamente.
          Cada dato que compartes nos acerca a conectar tu café
          con compradores que valoran el origen y la calidad.
        </p>

        <div className="gracias-impact">
          <div className="gracias-impact-item">
            <span className="gracias-impact-text">Tu café llegará más lejos</span>
          </div>
          <div className="gracias-impact-item">
            <span className="gracias-impact-text">Mejores precios para ti</span>
          </div>
          <div className="gracias-impact-item">
            <span className="gracias-impact-text">Conexión directa con compradores</span>
          </div>
        </div>

        <div className="gracias-actions">
          <button
            className="gracias-btn-primary"
            onClick={() => router.push('/encuesta/nueva')}
          >
            Llenar otra encuesta
          </button>

          <button
            className="gracias-btn-secondary"
            onClick={() => router.push('/')}
          >
            {isAuthenticated ? 'Ir al Panel' : 'Volver al inicio'}
          </button>
        </div>

        <p className="gracias-footer">
          ¿Tienes un vecino caficultor? Invítalo a participar desde este mismo dispositivo.
        </p>
      </div>
    </div>
  );
}
