'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, type Finca, type FincaFoto } from '@/lib/db';
import { useSurveyor } from '@/hooks/useSurveyor';
import { useAuth } from '@/lib/auth';
import { compressImage, blobToDataURL } from '@/lib/imageCompressor';
import { Toast, useToast } from '@/components/Toast';
import {
  VARIEDADES_CAFE, METODOS_BENEFICIO, UBICACION_CONSERVACION,
  CULTIVOS_SOMBRA, MANEJO_AGRONOMICO, FOTO_TIPOS,
  ROLES_INFORMANTE, GENERO_LIDERAZGO, INFRAESTRUCTURA_SECADO,
  TIPOS_FERMENTACION, PERFILES_TAZA, CERTIFICACIONES, MANEJO_AGUAS_MIELES, FAUNA_BIODIVERSIDAD, TIPOS_FUENTES_HIDRICAS
} from '@/lib/constants';
import MonthRangeSelector from '@/components/MonthRangeSelector';
import LocationPicker from '@/components/LocationPicker';
import { syncSurveyToFirestore } from '@/lib/firestoreService';

const STEPS = ['Metadatos', 'Perfil y Ubicación', 'Dimensiones', 'Producto', 'Conservación', 'Fotos y GPS'];
const MAX_PHOTOS = 20;

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const emptyForm = (): Omit<Finca, 'id' | 'createdAt' | 'updatedAt'> => ({
  surveyorId: 0, fechaVisita: todayStr(), idFincaOficina: '',
  timestamp_inicio: new Date().toISOString(), timestamp_fin: null,
  sync_status: null, accuracy_gps: null, rol_informante: '',
  nombreCaficultor: '', nombreFinca: '', departamento: '', municipio: '', vereda: '',
  whatsapp: '', correo: '', instagram: '', facebook: '',
  genero_liderazgo: '', historia_finca: '',
  altitud: null, altitudElipsoidal: null, altitudMSNM: null,
  anosTradicion: 1, areaTotalHa: null, areaCafeHa: null,
  plantasProduccion: 0, plantasLevante: 0, plantasZoca: 0,
  cosechaPrincipalIni: null, cosechaPrincipalFin: null,
  cosechaMitacaIni: null, cosechaMitacaFin: null,
  produccion_anual_kg: null, edad_promedio_cafetales: null,
  infraestructura_secado: [], otraInfraestructuraSecado: '',
  puntajeSCA: null, sinMedicionFormal: false, sinPerfilTaza: false, sinCertificaciones: false,
  variedades: [], otraVariedad: '', metodosBeneficio: [], otroMetodoBeneficio: '',
  tipos_fermentacion: [], otroTipoFermentacion: '',
  perfil_taza: [], otroPerfilTaza: '',
  certificaciones: [], otraCertificacion: '',
  ubicacionConservacion: '', nombreZonaConservacion: '',
  areaBosqueHa: null, numFuentesHidricas: null, tipos_fuentes_hidricas: [], otroTipoFuenteHidrica: '', sinFuentesHidricas: false,
  cultivosSombra: [], otroCultivoSombra: '', manejoAgronomico: '', manejo_aguas_mieles: '', otroManejoAguasMieles: '',
  fauna_biodiversidad: [], otraFaunaBiodiversidad: '', sinFaunaBiodiversidad: false,
  gpsLat: null, gpsLong: null, gpsAlt: null, gpsPrecision: null,
  presionAtmosferica: null, iluminacionAmbiental: null,
  consentimientoImagen: false, aceptaHabeasData: false, observaciones: '',
  origenEncuesta: 'particular',
  status: 'borrador',
});

interface PhotoItem { blob: Blob; tipo: FincaFoto['tipo']; nombre: string; preview: string; }

export default function NuevaEncuestaPage() {
  const router = useRouter();
  const { surveyor, loading } = useSurveyor();
  const { isAuthenticated, role, surveyorId: authSurveyorId } = useAuth();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...emptyForm(), aceptaHabeasData: false });
  const [showTerms, setShowTerms] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isGpsHovered, setIsGpsHovered] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Conditionally define steps
  const surveySteps = isAuthenticated ? STEPS : STEPS.slice(1);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const set = useCallback(<K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleArray = useCallback((key: 'variedades' | 'metodosBeneficio' | 'cultivosSombra' | 'infraestructura_secado' | 'tipos_fermentacion' | 'perfil_taza' | 'certificaciones', val: string) => {
    setForm((prev) => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  }, []);

  // GPS capture with 10s averaging logic
  const captureGPS = (isAuto = false): Promise<{ lat: number; lon: number; alt: number | null; precision: number; msnm: number | null } | null> => {
    if (!navigator.geolocation) { showToast('GPS no disponible'); return Promise.resolve(null); }
    setGpsLoading(true);
    if (!isAuto) showToast('Calibrando sensores y GPS...');

    const tryCaptureSensors = () => {
      try {
        if ('PressureSensor' in window) {
          // @ts-ignore
          const sensor = new PressureSensor({ frequency: 1 });
          sensor.onreading = () => { set('presionAtmosferica', parseFloat(sensor.pressure.toFixed(2))); sensor.stop(); };
          sensor.start();
        }
        if ('AmbientLightSensor' in window) {
          // @ts-ignore
          const light = new AmbientLightSensor();
          light.onreading = () => { set('iluminacionAmbiental', light.illuminance); light.stop(); };
          light.start();
        }
      } catch (e) { }
    };
    tryCaptureSensors();

    const timeout = isAuto ? 3000 : 8000;

    return new Promise((resolve) => {
      const samples: GeolocationCoordinates[] = [];
      const watchId = navigator.geolocation.watchPosition(
        (pos) => samples.push(pos.coords),
        (err) => console.warn('GPS Error:', err.message),
        { enableHighAccuracy: true, timeout: timeout, maximumAge: 0 }
      );

      setTimeout(async () => {
        navigator.geolocation.clearWatch(watchId);
        setGpsLoading(false);

        if (samples.length === 0) {
          if (!isAuto) showToast('No se capturaron muestras de GPS');
          resolve(null);
          return;
        }

        const best = samples.sort((a, b) => a.accuracy - b.accuracy)[0];
        const lat = parseFloat(best.latitude.toFixed(7));
        const lon = parseFloat(best.longitude.toFixed(7));
        const alt = best.altitude !== null ? parseFloat(best.altitude.toFixed(1)) : null;
        const precision = parseFloat(best.accuracy.toFixed(1));
        let msnm: number | null = null;

        setForm(prev => ({
          ...prev,
          gpsLat: lat, gpsLong: lon, gpsAlt: alt, gpsPrecision: precision, altitudElipsoidal: alt
        }));

        if (!isAuto) showToast(`Geodata fijada (±${precision}m)`);

        if (navigator.onLine) {
          try {
            const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
            const data = await res.json();
            if (data.results?.[0]?.elevation) {
              msnm = Math.round(data.results[0].elevation);
              setForm(prev => ({ ...prev, altitudMSNM: msnm, altitud: msnm }));
            }
          } catch (e) { console.error('Elevation API error:', e); }
        }
        resolve({ lat, lon, alt, precision, msnm });
      }, timeout);
    });
  };

  // Photo capture
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      showToast(`Máximo ${MAX_PHOTOS} fotos`);
      return;
    }
    for (const file of Array.from(files)) {
      try {
        const blob = await compressImage(file);
        const preview = await blobToDataURL(blob);
        const tipo: FincaFoto['tipo'] = photos.length === 0 ? 'retrato' : photos.length === 1 ? 'panoramica' : photos.length === 2 ? 'infraestructura' : 'extra';
        setPhotos((prev) => [...prev, { blob, tipo, nombre: file.name, preview }]);
      } catch { showToast('Error comprimiendo foto'); }
    }
    e.target.value = '';
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  // Save
  const handleSave = async (status: 'borrador' | 'completo') => {
    if (isAuthenticated && !surveyor?.id) { showToast('Configura tu perfil primero'); return; }
    setSaving(true);

    try {
      let finalFormState = { ...form };

      // Captura automática de GPS si es 'completo' y no se ha capturado
      if (status === 'completo' && form.gpsLat === null) {
        showToast('Fijando ubicación final...');
        const gpsResult = await captureGPS(true);
        if (gpsResult) {
          finalFormState = {
            ...finalFormState,
            gpsLat: gpsResult.lat,
            gpsLong: gpsResult.lon,
            gpsAlt: gpsResult.alt,
            gpsPrecision: gpsResult.precision,
            altitudElipsoidal: gpsResult.alt,
            altitudMSNM: gpsResult.msnm,
            altitud: gpsResult.msnm || finalFormState.altitud
          };
        }
      }

      const now = new Date();
      const finalFincaData: Finca = {
        ...finalFormState,
        timestamp_fin: now.toISOString(),
        sync_status: (navigator.onLine ? 'online' : 'offline') as any,
        surveyorId: isAuthenticated ? (surveyor?.id || authSurveyorId || 0) : 0,
        origenEncuesta: isAuthenticated ? 'encuestador' : 'particular',
        status,
        createdAt: form.createdAt || now,
        updatedAt: now,
      };

      const fincaId = await db.fincas.add(finalFincaData) as number;
      
      // Guardar fotos
      for (const photo of photos) {
        await db.fotos.add({
          fincaId: fincaId, 
          tipo: photo.tipo, 
          blob: photo.blob,
          nombre: photo.nombre, 
          tamanioKB: Math.round(photo.blob.size / 1024), 
          createdAt: now,
        });
      }

      // Sincronización en segundo plano
      if (status === 'completo' && navigator.onLine) {
        syncSurveyToFirestore(fincaId).catch(e => console.error('Background sync failed:', e));
      }

      if (status === 'completo') {
        if (!isAuthenticated) {
          router.push('/encuesta/gracias');
        } else {
          setShowSuccess(true);
        }
      } else {
        showToast('Borrador guardado');
        const target = isAuthenticated ? '/fincas' : '/';
        setTimeout(() => router.push(target), 800);
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error guardando');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-lg">Cargando...</div>;
  // Only require surveyor profile for authenticated encuestadores
  if (isAuthenticated && !surveyor) {
    return (
      <div className="empty-state">
        <div className="empty-icon"></div>
        <div className="empty-title">Perfil requerido</div>
        <div className="empty-desc">Configura tu perfil de encuestador antes de iniciar.</div>
        <a href="/perfil" className="btn btn-primary">Ir a Perfil</a>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Nueva encuesta</h1>
        <p className="page-subtitle">{surveySteps[step]} ({step + 1}/{surveySteps.length})</p>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {surveySteps.map((_, i) => (
          <div key={i} className={`stepper-step ${i === step ? 'active' : i < step ? 'done' : ''}`} />
        ))}
      </div>

      {/* Step: Metadatos */}
      {surveySteps[step] === 'Metadatos' && (
        <div className="card">
          <div className="section-header"><span className="section-number">0</span><span className="section-title">Información general</span></div>
          {isAuthenticated && surveyor && (
            <div className="form-group">
              <label className="form-label">Encuestador</label>
              <input className="form-input" value={surveyor.nombre} disabled />
            </div>
          )}
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="fecha-visita">Fecha de visita</label>
              <input id="fecha-visita" className="form-input" value={form.fechaVisita} onChange={(e) => set('fechaVisita', e.target.value)} placeholder="DD/MM/AAAA" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="id-finca-oficina">ID finca (oficina)</label>
              <input id="id-finca-oficina" className="form-input" value={form.idFincaOficina} onChange={(e) => set('idFincaOficina', e.target.value)} placeholder="FNC-001" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Rol del informante</label>
            <div className="chip-group">
              {ROLES_INFORMANTE.map((rol) => (
                <button
                  key={rol}
                  type="button"
                  className={`chip ${form.rol_informante === rol ? 'active' : ''}`}
                  onClick={() => set('rol_informante', rol)}
                >
                  {rol}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Perfil y Ubicación */}
      {surveySteps[step] === 'Perfil y Ubicación' && (
        <div className="card">
          <div className="section-header"><span className="section-number">1</span><span className="section-title">Perfil del caficultor y ubicación</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Queremos conocer tu historia!</b><br />
              Estos datos nos ayudan a crear un perfil único para tu café, conectando tu esfuerzo personal con los amantes del café que valoran el origen y la tradición.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="nombre-caficultor">Nombre completo del caficultor(a)</label>
            <input id="nombre-caficultor" className="form-input" value={form.nombreCaficultor} onChange={(e) => set('nombreCaficultor', e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="nombre-finca">Nombre de la Finca</label>
            <input id="nombre-finca" className="form-input" value={form.nombreFinca} onChange={(e) => set('nombreFinca', e.target.value)} placeholder="Finca La Esperanza" />
          </div>
          <LocationPicker
            departamento={form.departamento}
            municipio={form.municipio}
            onChangeDepartamento={(dep) => set('departamento', dep)}
            onChangeMunicipio={(mun) => set('municipio', mun)}
          />
          <div className="form-group mt-md">
            <label className="form-label" htmlFor="vereda">Vereda / Corregimiento</label>
            <input
              id="vereda"
              className="form-input"
              value={form.vereda}
              onChange={(e) => set('vereda', e.target.value)}
              placeholder="Nombre de la vereda"
            />
            <p className="form-hint">Escribe el nombre de la vereda donde está ubicada tu finca.</p>
          </div>
          <div className="form-group">
            <label className="form-label mb-sm">Género / Liderazgo</label>

            <div className="chip-group" style={{ justifyContent: 'center' }}>

              {GENERO_LIDERAZGO.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip ${form.genero_liderazgo === g ? 'active' : ''}`}
                  onClick={() => set('genero_liderazgo', g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="anos-tradicion">Años de tradición familiar</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => set('anosTradicion', Math.max(1, (form.anosTradicion || 1) - 1))}
              >-</button>
              <input
                id="anos-tradicion"
                className="form-input"
                type="number"
                style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: '600' }}
                value={form.anosTradicion ?? 1}
                onChange={(e) => set('anosTradicion', e.target.value ? Math.max(1, Number(e.target.value)) : 1)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => set('anosTradicion', (form.anosTradicion || 1) + 1)}
              >+</button>
            </div>
            <div className="chip-group" style={{ justifyContent: 'center' }}>
              {[5, 10, 20, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`chip ${form.anosTradicion === val ? 'active' : ''}`}
                  onClick={() => set('anosTradicion', val)}
                >
                  {val}+ años
                </button>
              ))}
            </div>
          </div>

          <div className="form-label mt-md mb-sm">Contacto y redes sociales</div>
          <p className="form-hint mb-md">Estos datos son opcionales, pero recomendados para que los compradores puedan conocerte.</p>
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" className="form-input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+57 300 000 0000" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="correo">Correo Electrónico</label>
              <input id="correo" className="form-input" type="email" value={form.correo} onChange={(e) => set('correo', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
          </div>
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="instagram">Instagram</label>
              <input id="instagram" className="form-input" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@usuario" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="facebook">TikTok</label>
              <input id="facebook" className="form-input" value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="@usuario" />
            </div>
          </div>

          <div className="form-group mt-md">
            <label className="form-label" htmlFor="historia-finca">El alma de tu café (Tu finca caficultora)</label>
            <p className="form-hint mb-sm">
              Los compradores internacionales buscan una conexión con el origen. Cuéntanos sobre tu herencia familiar y el amor que le pones a cada grano. <b>¡Tu historia aumenta el valor de tu café!</b>
            </p>
            <textarea
              id="historia-finca"
              className="form-textarea"
              value={form.historia_finca}
              onChange={(e) => set('historia_finca', e.target.value)}
              maxLength={5000}
              style={{ minHeight: '150px' }}
              placeholder="¿Cómo empezó todo? Cuéntanos sobre tu familia, las tradiciones que conservas y lo que hace que tu finca sea única en el mundo..."
            />
            <p className="form-hint" style={{ textAlign: 'right' }}>{form.historia_finca.length}/5000 caracteres</p>
          </div>
        </div>
      )}

      {/* Step: Dimensiones */}
      {surveySteps[step] === 'Dimensiones' && (
        <div className="card">
          <div className="section-header"><span className="section-number">2</span><span className="section-title">Cosecha y productividad</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Tus números cuentan una gran historia!</b> <br />
              Conocer el tamaño de tu finca y tu producción nos permite planificar mejores oportunidades comerciales y asegurar que tu café llegue a los mercados correctos.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label mb-sm">Cuentanos, cual es el tamaño de tu finca (HA)</label>
            <p className="form-hint mb-md">Usamos esta información para comprender el contexto fisico de tu finca. </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => set('areaTotalHa', Math.max(0, (form.areaTotalHa || 0) - 1))}>-</button>
              <input
                className="form-input"
                type="number"
                style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: '600' }}
                value={form.areaTotalHa ?? 0}
                onChange={(e) => set('areaTotalHa', e.target.value ? Math.floor(Number(e.target.value)) : 0)}
              />
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => set('areaTotalHa', (form.areaTotalHa || 0) + 1)}>+</button>
            </div>
            <div className="chip-group" style={{ justifyContent: 'center' }}>
              {[1, 5, 10, 20, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`chip ${form.areaTotalHa === val ? 'active' : ''}`}
                  onClick={() => set('areaTotalHa', val)}
                >
                  {val} HA
                </button>
              ))}
            </div>
          </div>

          <div className="form-label mt-lg mb-sm">Cuentanos, cuanto café tienes</div>
          <p className="form-hint mb-md">Ingresa la cantidad aproximada de plantas de café en tu finca, esto nos permite calcular la productividad por hectárea.</p>

          <div className="row-2">
            <div className="form-group">
              <label className="form-label">Plantas en producción</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('plantasProduccion', Math.max(0, (form.plantasProduccion || 0) - 100))}>-</button>
                <input
                  className="form-input"
                  type="number"
                  style={{ textAlign: 'center', padding: 'var(--space-xs)' }}
                  value={form.plantasProduccion ?? 0}
                  onChange={(e) => set('plantasProduccion', e.target.value ? Number(e.target.value) : 0)}
                />
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('plantasProduccion', (form.plantasProduccion || 0) + 100)}>+</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Plantas en levante</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('plantasLevante', Math.max(0, (form.plantasLevante || 0) - 100))}>-</button>
                <input
                  className="form-input"
                  type="number"
                  style={{ textAlign: 'center', padding: 'var(--space-xs)' }}
                  value={form.plantasLevante ?? 0}
                  onChange={(e) => set('plantasLevante', e.target.value ? Number(e.target.value) : 0)}
                />
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('plantasLevante', (form.plantasLevante || 0) + 100)}>+</button>
              </div>
            </div>
          </div>

          <div className="row-2">
            <div className="form-group">
              <label className="form-label">Plantas en zoca</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('plantasZoca', Math.max(0, (form.plantasZoca || 0) - 100))}>-</button>
                <input
                  className="form-input"
                  type="number"
                  style={{ textAlign: 'center', padding: 'var(--space-xs)' }}
                  value={form.plantasZoca ?? 0}
                  onChange={(e) => set('plantasZoca', e.target.value ? Number(e.target.value) : 0)}
                />
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('plantasZoca', (form.plantasZoca || 0) + 100)}>+</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">TOTAL PLANTAS</label>
              <div className="form-input" style={{
                textAlign: 'center',
                background: 'var(--color-bg-card-hover)',
                fontWeight: '700',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                {(form.plantasProduccion || 0) + (form.plantasLevante || 0) + (form.plantasZoca || 0)}
              </div>
            </div>
          </div>
          <MonthRangeSelector
            label="Meses cosecha principal"
            startMonth={form.cosechaPrincipalIni}
            endMonth={form.cosechaPrincipalFin}
            onChange={(start, end) => { set('cosechaPrincipalIni', start); set('cosechaPrincipalFin', end); }}
          />
          <MonthRangeSelector
            label="Meses secundaria o pepeo (mitaca)"
            startMonth={form.cosechaMitacaIni}
            endMonth={form.cosechaMitacaFin}
            onChange={(start, end) => { set('cosechaMitacaIni', start); set('cosechaMitacaFin', end); }}
          />
          <div className="row-2">
            <div className="form-group">
              <label className="form-label mb-sm">Producción anual estimada (kg)</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('produccion_anual_kg', Math.max(0, (form.produccion_anual_kg || 0) - 100))}>-</button>
                <input
                  className="form-input"
                  type="number"
                  style={{ textAlign: 'center', padding: 'var(--space-xs)' }}
                  value={form.produccion_anual_kg ?? 0}
                  onChange={(e) => set('produccion_anual_kg', e.target.value ? Number(e.target.value) : 0)}
                />
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('produccion_anual_kg', (form.produccion_anual_kg || 0) + 100)}>+</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label mb-sm">Edad aprox cafetales (años)</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('edad_promedio_cafetales', Math.max(1, (form.edad_promedio_cafetales || 0) - 1))}>-</button>
                <input
                  className="form-input"
                  type="number"
                  style={{ textAlign: 'center', padding: 'var(--space-xs)' }}
                  value={form.edad_promedio_cafetales ?? 1}
                  onChange={(e) => set('edad_promedio_cafetales', e.target.value ? Number(e.target.value) : 1)}
                />
                <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('edad_promedio_cafetales', (form.edad_promedio_cafetales || 0) + 1)}>+</button>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Infraestructura de secado</label>
            <div className="check-group">
              {INFRAESTRUCTURA_SECADO.map((inf) => (
                <label key={inf} className={`check-item ${form.infraestructura_secado.includes(inf) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.infraestructura_secado.includes(inf)} onChange={() => toggleArray('infraestructura_secado', inf)} />{inf}
                </label>
              ))}
            </div>
            {form.infraestructura_secado.includes('Otro') && (
              <input className="form-input mt-md" placeholder="Escribe otra infraestructura de secado..." value={form.otraInfraestructuraSecado} onChange={(e) => set('otraInfraestructuraSecado', e.target.value)} />
            )}
          </div>
        </div>
      )}

      {/* Step: Producto */}
      {surveySteps[step] === 'Producto' && (
        <div className="card">
          <div className="section-header"><span className="section-number">3</span><span className="section-title">El café</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Aquí es donde ocurre la magia!</b><br />
              Tus métodos de beneficio y fermentación son los que crean los sabores únicos que buscan los compradores de café de especialidad en todo el mundo.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label mb-sm">Variedades cultivadas</label>
            <p className="form-hint mb-md">Las variedades definen la calidad y resistencia de tu café. Marca todas las que tengas en tu finca.</p>
            <div className="check-group">
              {VARIEDADES_CAFE.map((v) => (
                <label key={v} className={`check-item ${form.variedades.includes(v) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.variedades.includes(v)} onChange={() => toggleArray('variedades', v)} />{v}
                </label>
              ))}
            </div>
            {form.variedades.includes('Otro') && (
              <input className="form-input mt-md" placeholder="Escribe otra variedad..." value={form.otraVariedad} onChange={(e) => set('otraVariedad', e.target.value)} />
            )}
          </div>

          <div className="form-group">
            <label className="form-label mb-sm">Tipos de fermentación</label>
            <p className="form-hint mb-md">Es el tiempo que el café reposa en cereza o en baba. Puede ser <b>Sin fermentación</b>, <b>Aeróbica</b> (con aire) o <b>Anaeróbica</b> (en tanques o bolsas selladas). Este proceso potencia el sabor del café y su valor en el mercado extranjero.</p>
            <div className="check-group">
              {TIPOS_FERMENTACION.map((t) => (
                <label key={t} className={`check-item ${form.tipos_fermentacion.includes(t) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.tipos_fermentacion.includes(t)} onChange={() => toggleArray('tipos_fermentacion', t)} />{t}
                </label>
              ))}
            </div>
            {form.tipos_fermentacion.includes('Otro') && (
              <input className="form-input mt-md" placeholder="Escribe otro tipo de fermentación..." value={form.otroTipoFermentacion} onChange={(e) => set('otroTipoFermentacion', e.target.value)} />
            )}
          </div>

          <div className="form-group">
            <label className="form-label mb-sm">Métodos de beneficio</label>
            <p className="form-hint mb-md">Es la forma en que retiras la cáscara y secas el grano. <b>Lavados</b>: uso de agua para retirar la baba o mucilago. <b>Honey</b>: secado conservando parte del dulce (mucílago). <b>Natural</b>: secado de la cereza entera sin retirar la cáscara. Estos métodos influencian el sabor del café y aumentan su valor en el mercado extranjero.</p>
            <div className="check-group">
              {METODOS_BENEFICIO.map((m) => (
                <label key={m} className={`check-item ${form.metodosBeneficio.includes(m) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.metodosBeneficio.includes(m)} onChange={() => toggleArray('metodosBeneficio', m)} />{m}
                </label>
              ))}
            </div>
            {form.metodosBeneficio.includes('Otro') && (
              <input className="form-input mt-md" placeholder="Escribe otro método de beneficio..." value={form.otroMetodoBeneficio} onChange={(e) => set('otroMetodoBeneficio', e.target.value)} />
            )}
          </div>
          <div className="form-group mt-md">
            <label className="form-label mb-sm">Puntaje SCA (Calidad en Taza)</label>
            <p className="form-hint mb-md">El <b>puntaje SCA</b> es una calificación internacional que mide la calidad en taza. Un café se considera 'de especialidad' a partir de los 80 puntos. Esta nota es otorgada por catadores certificados (Q-Graders) basándose en la complejidad y limpieza de los sabores.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                disabled={form.sinMedicionFormal}
                onClick={() => set('puntajeSCA', Math.max(0, (form.puntajeSCA || 80) - 0.5))}
              >-</button>
              <input
                id="puntaje-sca"
                className="form-input"
                type="number"
                step="0.5"
                disabled={form.sinMedicionFormal}
                style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: '600', maxWidth: '120px' }}
                value={form.puntajeSCA ?? (form.sinMedicionFormal ? '' : '')}
                onChange={(e) => set('puntajeSCA', e.target.value ? Number(e.target.value) : null)}
                placeholder="80.0"
              />
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                disabled={form.sinMedicionFormal}
                onClick={() => set('puntajeSCA', Math.min(100, (form.puntajeSCA || 80) + 0.5))}
              >+</button>
            </div>

            <div className="chip-group" style={{ justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              {[80, 83, 85, 87, 90].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={form.sinMedicionFormal}
                  className={`chip ${form.puntajeSCA === val ? 'active' : ''}`}
                  onClick={() => set('puntajeSCA', val)}
                >
                  {val} pts
                </button>
              ))}
            </div>

            <label className={`check-item ${form.sinMedicionFormal ? 'selected' : ''}`} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: 'var(--space-md)' }}>
              <input type="checkbox" checked={form.sinMedicionFormal} onChange={(e) => { set('sinMedicionFormal', e.target.checked); if (e.target.checked) set('puntajeSCA', null); }} />
              <span style={{ fontWeight: '600' }}>Sin medición oficial o no la conoce</span>
            </label>
          </div>
          <div className="form-group mt-md">
            <label className="form-label mb-sm">Perfil de taza (notas de cata)</label>
            <p className="form-hint mb-md">Describe los sabores y aromas que se sienten al catar el café. Elige los que más identifican a tu producto.</p>
            <div className="check-group">
              {PERFILES_TAZA.map((p) => (
                <label key={p} className={`check-item ${form.perfil_taza.includes(p) ? 'selected' : ''} ${form.sinPerfilTaza ? 'disabled' : ''}`}>
                  <input type="checkbox" disabled={form.sinPerfilTaza} checked={form.perfil_taza.includes(p)} onChange={() => toggleArray('perfil_taza', p)} />{p}
                </label>
              ))}
            </div>
            {form.perfil_taza.includes('Otro') && !form.sinPerfilTaza && (
              <input className="form-input mt-md" placeholder="Escribe otra nota de cata..." value={form.otroPerfilTaza} onChange={(e) => set('otroPerfilTaza', e.target.value)} />
            )}

            <label className={`check-item ${form.sinPerfilTaza ? 'selected' : ''}`} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <input type="checkbox" checked={form.sinPerfilTaza} onChange={(e) => { set('sinPerfilTaza', e.target.checked); if (e.target.checked) { set('perfil_taza', []); set('otroPerfilTaza', ''); } }} />
              <span style={{ fontWeight: '600' }}>Sin perfil de taza o no conoce sus notas</span>
            </label>
          </div>

          <div className="form-group mt-md">
            <label className="form-label mb-sm">Certificaciones</label>
            <p className="form-hint mb-md">Sellos que garantizan tus buenas prácticas ambientales o sociales. Ayudan a valorizar mejor tu café.</p>
            <div className="check-group">
              {CERTIFICACIONES.map((c) => (
                <label key={c} className={`check-item ${form.certificaciones.includes(c) ? 'selected' : ''} ${form.sinCertificaciones ? 'disabled' : ''}`}>
                  <input type="checkbox" disabled={form.sinCertificaciones} checked={form.certificaciones.includes(c)} onChange={() => toggleArray('certificaciones', c)} />{c}
                </label>
              ))}
            </div>
            {form.certificaciones.includes('Otro') && !form.sinCertificaciones && (
              <input className="form-input mt-md" placeholder="Escribe otra certificación..." value={form.otraCertificacion} onChange={(e) => set('otraCertificacion', e.target.value)} />
            )}

            <label className={`check-item ${form.sinCertificaciones ? 'selected' : ''}`} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <input type="checkbox" checked={form.sinCertificaciones} onChange={(e) => { set('sinCertificaciones', e.target.checked); if (e.target.checked) { set('certificaciones', []); set('otraCertificacion', ''); } }} />
              <span style={{ fontWeight: '600' }}>No cuenta con certificaciones</span>
            </label>
          </div>
        </div>
      )}

      {/* Step: Conservación */}
      {surveySteps[step] === 'Conservación' && (
        <div className="card">
          <div className="section-header"><span className="section-number">4</span><span className="section-title">Sostenibilidad ambiental</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Tu compromiso con la naturaleza aumenta el valor de tu café!</b><br />
              A los compradores internacionales les encanta saber cómo proteges el agua, el bosque y los animales. Contar tu historia ambiental nos ayuda a conseguir mejores precios y mercados que valoran la sostenibilidad.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label mb-sm">Bosque protegido (ha)</label>
            <p className="form-hint mb-md">Cuéntanos sobre tus áreas de reserva. El bosque nativo es el pulmón de tu finca y conservarlo le da un valor especial a tu café. En mercados como el Europeo esto aumenta el valor de tu café, por que aprecian la sostenibilidad.</p>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('areaBosqueHa', Math.max(0, (form.areaBosqueHa || 0) - 0.5))}>-</button>
              <input
                className="form-input"
                type="number"
                style={{ textAlign: 'center', padding: 'var(--space-xs)', maxWidth: '100px' }}
                value={form.areaBosqueHa ?? 0}
                onChange={(e) => set('areaBosqueHa', e.target.value ? Number(e.target.value) : 0)}
              />
              <button type="button" className="btn btn-secondary btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => set('areaBosqueHa', (form.areaBosqueHa || 0) + 0.5)}>+</button>
            </div>
            <div className="chip-group mt-sm" style={{ justifyContent: 'center' }}>
              {[0, 0.5, 1, 2, 5, 10].map(v => (
                <button key={v} type="button" className={`chip ${form.areaBosqueHa === v ? 'active' : ''}`} onClick={() => set('areaBosqueHa', v)}>{v} ha</button>
              ))}
            </div>
          </div>

          <div className="form-group mt-md">
            <label className="form-label mb-sm">Ubicación respecto a zonas de conservación</label>
            <p className="form-hint mb-md">A veces nuestras fincas están cerca de parques naturales o reservas. Cuéntanos si la tuya tiene el privilegio de estar en una de estas zonas.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              {UBICACION_CONSERVACION.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  className={`chip ${form.ubicacionConservacion === u.value ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 'var(--space-md) var(--space-sm)',
                    height: 'auto',
                    textAlign: 'center',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    minHeight: '100px'
                  }}
                  onClick={() => set('ubicacionConservacion', u.value)}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', color: 'inherit' }}>{u.label}</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.8, lineHeight: '1.3', fontWeight: '400', color: 'inherit' }}>{u.desc}</span>
                </button>
              ))}
            </div>
            {(form.ubicacionConservacion === 'dentro' || form.ubicacionConservacion === 'cerca') && (
              <input className="form-input mt-md" placeholder="Escribe el nombre del área o reserva..." value={form.nombreZonaConservacion} onChange={(e) => set('nombreZonaConservacion', e.target.value)} />
            )}
          </div>

          <div className="form-group">
            <label className="form-label mb-sm">Manejo agronómico</label>
            <p className="form-hint mb-md">La forma en que cuidas tu cultivo dice mucho de tu compromiso. Cuéntanos qué tipo de insumos usas para mantener tus cafetales sanos.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              {MANEJO_AGRONOMICO.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`chip ${form.manejoAgronomico === m.value ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 'var(--space-md) var(--space-sm)',
                    height: 'auto',
                    textAlign: 'center',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    minHeight: '100px'
                  }}
                  onClick={() => set('manejoAgronomico', m.value)}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', display: 'block', color: 'inherit' }}>{m.label}</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.8, lineHeight: '1.3', fontWeight: '400', color: 'inherit' }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group mt-md">
            <label className="form-label mb-sm">Manejo de aguas mieles</label>
            <p className="form-hint mb-md">Las aguasmieles son un subproducto del proceso, queremos saber cómo las manejas para que no afecten la limpieza de tu finca.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              {MANEJO_AGUAS_MIELES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`chip ${form.manejo_aguas_mieles === m.value ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 'var(--space-md) var(--space-sm)',
                    height: 'auto',
                    textAlign: 'center',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    minHeight: '100px'
                  }}
                  onClick={() => set('manejo_aguas_mieles', m.value)}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', display: 'block', color: 'inherit' }}>{m.label}</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.8, lineHeight: '1.3', fontWeight: '400', color: 'inherit' }}>{m.desc}</span>
                </button>
              ))}
            </div>
            {form.manejo_aguas_mieles === 'Otro' && (
              <input className="form-input mt-md" placeholder="Escribe otro manejo de aguas..." value={form.otroManejoAguasMieles} onChange={(e) => set('otroManejoAguasMieles', e.target.value)} />
            )}
          </div>

          <div className="form-group mt-md">
            <label className="form-label mb-sm">Cultivos de sombra</label>
            <p className="form-hint mb-md">Los árboles de sombra refrescan el cafetal y protegen el suelo. Cuéntanos qué variedad de árboles tienes acompañando a tus cafetales.</p>
            <div className="check-group">
              {CULTIVOS_SOMBRA.map((c) => (
                <label key={c} className={`check-item ${form.cultivosSombra.includes(c) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.cultivosSombra.includes(c)} onChange={() => toggleArray('cultivosSombra', c)} />{c}
                </label>
              ))}
            </div>
            {form.cultivosSombra.includes('Otro') && (
              <input className="form-input mt-md" placeholder="Escribe otro cultivo de sombra..." value={form.otroCultivoSombra} onChange={(e) => set('otroCultivoSombra', e.target.value)} />
            )}
          </div>

          <div className="form-group mt-md">
            <label className="form-label mb-sm">Fuentes hídricas</label>
            <p className="form-hint mb-md">Las quebradas, ríos o nacimientos nos dicen qué tan bonita es tu finca y qué tanta disponibilidad de agua tienes. Marca los que pasan por tu tierra.</p>
            <div className="check-group">
              {TIPOS_FUENTES_HIDRICAS.map((f) => (
                <label key={f} className={`check-item ${form.tipos_fuentes_hidricas.includes(f) ? 'selected' : ''} ${form.sinFuentesHidricas ? 'disabled' : ''}`}>
                  <input type="checkbox" disabled={form.sinFuentesHidricas} checked={form.tipos_fuentes_hidricas.includes(f)} onChange={() => toggleArray('tipos_fuentes_hidricas', f)} />{f}
                </label>
              ))}
            </div>
            {form.tipos_fuentes_hidricas.includes('Otro') && !form.sinFuentesHidricas && (
              <input className="form-input mt-md" placeholder="Escribe otro tipo de fuente..." value={form.otroTipoFuenteHidrica} onChange={(e) => set('otroTipoFuenteHidrica', e.target.value)} />
            )}

            <label className={`check-item ${form.sinFuentesHidricas ? 'selected' : ''}`} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <input type="checkbox" checked={form.sinFuentesHidricas} onChange={(e) => { set('sinFuentesHidricas', e.target.checked); if (e.target.checked) { set('tipos_fuentes_hidricas', []); set('otroTipoFuenteHidrica', ''); } }} />
              <span style={{ fontWeight: '600' }}>No hay cuerpos de agua en la finca</span>
            </label>
          </div>

          <div className="form-group mt-md">
            <label className="form-label mb-sm">Fauna y Biodiversidad</label>
            <p className="form-hint mb-md">Cuéntanos sobre la fauna: qué animalitos, aves y árboles representativos se han visto o conservas en la finca.</p>
            <div className="check-group">
              {FAUNA_BIODIVERSIDAD.map((f) => (
                <label key={f} className={`check-item ${form.fauna_biodiversidad.includes(f) ? 'selected' : ''} ${form.sinFaunaBiodiversidad ? 'disabled' : ''}`}>
                  <input type="checkbox" disabled={form.sinFaunaBiodiversidad} checked={form.fauna_biodiversidad.includes(f)} onChange={() => toggleArray('fauna_biodiversidad', f)} />{f}
                </label>
              ))}
            </div>
            {form.fauna_biodiversidad.includes('Otro') && !form.sinFaunaBiodiversidad && (
              <input className="form-input mt-md" placeholder="Escribe otra especie o planta..." value={form.otraFaunaBiodiversidad} onChange={(e) => set('otraFaunaBiodiversidad', e.target.value)} />
            )}

            <label className={`check-item ${form.sinFaunaBiodiversidad ? 'selected' : ''}`} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <input type="checkbox" checked={form.sinFaunaBiodiversidad} onChange={(e) => { set('sinFaunaBiodiversidad', e.target.checked); if (e.target.checked) { set('fauna_biodiversidad', []); set('otraFaunaBiodiversidad', ''); } }} />
              <span style={{ fontWeight: '600' }}>No se observa fauna representativa</span>
            </label>
          </div>
        </div>
      )}

      {/* Step: Fotos y GPS */}
      {surveySteps[step] === 'Fotos y GPS' && (
        <div className="card">
          <div className="section-header"><span className="section-number">5</span><span className="section-title">Geodata y multimedia</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Hemos llegado al final, te agradecemos!</b><br />
              Un último paso y muy importante: Las fotos y la ubicación exacta validan el origen de tu café y permiten que el comprador "visite" tu finca virtualmente desde cualquier lugar del mundo.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Ubicación Geoespacial y Altitud</label>
            <p className="form-hint mb-md">Fijar la ubicación exacta nos ayuda a certificar que el café es de tu finca. Presiona el botón y espera unos segundos mientras calibramos la señal.</p>

            <button
              type="button"
              onClick={() => captureGPS()}
              disabled={gpsLoading}
              onMouseEnter={() => setIsGpsHovered(true)}
              onMouseLeave={() => setIsGpsHovered(false)}
              style={{
                width: '100%',
                height: '62px',
                background: gpsLoading ? 'rgba(255,255,255,0.03)' : (isGpsHovered ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'),
                border: `1px solid ${gpsLoading ? '#BD8B64' : (isGpsHovered ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)')}`,
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                color: '#fff',
                fontSize: '1.05rem',
                fontWeight: '600',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isGpsHovered ? '0 10px 25px rgba(236, 165, 33, 0.2)' : '0 10px 20px rgba(0,0,0,0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(5px)'
              }}
            >
              {/* Indicador de Estado (Punto de pulso) */}
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: (form.gpsLat !== null && !gpsLoading) ? '#2ecc71' : '#BD8B64',
                boxShadow: `0 0 12px ${(form.gpsLat !== null && !gpsLoading) ? '#2ecc71' : '#BD8B64'}`,
                transition: 'all 0.5s ease',
                animation: gpsLoading ? 'pulse 1.5s infinite' : 'none'
              }} />

              <span style={{ letterSpacing: '0.3px', opacity: gpsLoading ? 0.8 : 1 }}>
                {gpsLoading ? 'Sincronizando con satélites...' : (form.gpsLat !== null ? 'Ubicación Fijada Correctamente' : 'Fijar Coordenadas del Origen')}
              </span>

              {/* Barra de Progreso Inferior */}
              {gpsLoading && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
                  width: '100%',
                  animation: 'shimmer 2s infinite linear'
                }} />
              )}
            </button>

            {(form.gpsLat !== null || gpsLoading) && (
              <div className="gps-result-card mt-md">
                <div className="gps-row">
                  <div className="gps-val"><span>Lat:</span> {form.gpsLat || '--'}</div>
                  <div className="gps-val"><span>Long:</span> {form.gpsLong || '--'}</div>
                </div>
                <div className="gps-row mt-xs">
                  <div className="gps-val"><span>H. Elipsoidal:</span> {form.gpsAlt !== null ? `${form.gpsAlt} m` : '--'}</div>
                  <div className="gps-val"><span>Alt. MSNM:</span> {form.altitudMSNM ? `${form.altitudMSNM} m` : (navigator.onLine ? '--' : 'Pendiente (Offline)')}</div>
                </div>
                <div className="gps-row mt-xs">
                  <div className="gps-val"><span>Presión:</span> {form.presionAtmosferica ? `${form.presionAtmosferica} hPa` : '--'}</div>
                  <div className="gps-val"><span>Iluminación:</span> {form.iluminacionAmbiental ? `${Math.round(form.iluminacionAmbiental)} lx` : '--'}</div>
                </div>
                {form.gpsPrecision !== null && (
                  <div className="gps-precision">Precisión GPS: ±{form.gpsPrecision}m</div>
                )}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Álbum fotográfico ({photos.length}/{MAX_PHOTOS})</label>
            <p className="form-hint mb-md">Captura la esencia de tu trabajo. Sube fotos de tu rostro, de los cafetales y de la infraestructura. ¡Las imágenes ayudan a vender mejor!</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                  <img src={p.preview} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px', fontSize: '0.6rem', color: '#fff', textAlign: 'center', textTransform: 'capitalize' }}>{p.tipo}</div>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(255,0,0,0.8)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: '12px',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '24px', opacity: 0.7 }}>📷</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600' }}>Añadir foto</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={handlePhoto} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="observaciones">¿Tienes alguna sugerencia para mejorar?</label>
            <textarea id="observaciones" className="form-textarea" value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Dinos cuales son las espectativas que tienes con nuestro proyecto, como podriamos ayudarte, que esperas de el. Agradecemos tus palabras y creatividad." />
          </div>

          <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 'var(--space-lg)', textAlign: 'center' }}>

            {/* Botón Principal: Finalizar */}
            <button
              className="btn btn-primary"
              onClick={() => handleSave('completo')}
              disabled={saving}
              style={{
                width: '100%',
                height: '64px',
                fontSize: '1.2rem',
                fontWeight: '700',
                letterSpacing: '0.5px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
                marginBottom: 'var(--space-md)'
              }}
            >
              {saving ? 'Guardando...' : 'Finalizar Encuesta'}
            </button>

            {/* Subtexto de Consentimiento Narrativo */}
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4', margin: '0 auto var(--space-xs)', maxWidth: '90%' }}>
              Al dar clic en <b>Finalizar</b>, autorizas de manera previa y expresa el uso de material fotográfico de la finca y el tratamiento de tus datos personales.
            </p>

            {/* Botón T&C Estilizado */}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--color-accent)',
                fontSize: '0.75rem',
                padding: '6px 12px',
                borderRadius: '20px',
                cursor: 'pointer',
                marginBottom: 'var(--space-lg)',
                transition: 'all 0.2s ease'
              }}
            >
              Leer términos y condiciones Habeas Data
            </button>

            {/* Botón Secundario: Borrador */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleSave('borrador')}
                disabled={saving}
                style={{
                  height: '48px',
                  padding: '0 var(--space-xl)',
                  fontSize: '0.9rem',
                  opacity: 0.8
                }}
              >
                Guardar solo como Borrador
              </button>
            </div>

            {/* Nota de Agradecimiento Final */}
            <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', margin: 0 }}>
                Valoramos inmensamente tu tiempo. Los datos recolectados impulsarán el desarrollo de herramientas digitales exclusivas para ti y tus compradores, permitiendo que el mundo entero reconozca y valore la excelencia de tu café.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-between mt-lg gap-sm">
        {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Anterior</button>}
        <div style={{ flex: 1 }} />
        {step < surveySteps.length - 1 && <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Siguiente</button>}
      </div>

      {toast && <Toast message={toast} />}

      {/* Modal Habeas Data */}
      {showTerms && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)' }}>
          <div className="card" style={{ maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', position: 'relative', border: '1px solid var(--color-accent)' }}>
            <h2 style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-md)' }}>Tratamiento de Datos Personales</h2>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
              <p>De conformidad con la <b>Ley 1581 de 2012 (Habeas Data)</b>, yo, en calidad de titular de la información, autorizo de manera libre, previa, expresa e informada a <b>CaféProy</b> para realizar el tratamiento de mis datos personales y de mi unidad productiva (finca).</p>

              <p style={{ marginTop: 'var(--space-sm)' }}><b>Finalidades:</b><br />
                - Caracterización técnica y social del caficultor.<br />
                - Promoción comercial y marketing de cafés de especialidad.<br />
                - Geolocalización para trazabilidad de origen.<br />
                - Uso de material fotográfico para vitrinas comerciales.</p>

              <p style={{ marginTop: 'var(--space-sm)' }}><b>Mis Derechos:</b><br />
                Entiendo que puedo conocer, actualizar, rectificar y solicitar la supresión de mis datos en cualquier momento. CaféProy garantiza la seguridad y confidencialidad de la información recolectada mediante protocolos de cifrado local y protección de bases de datos.</p>

              <p style={{ marginTop: 'var(--space-sm)' }}>Al marcar la casilla de aceptación, confirmo que soy el titular o estoy facultado para entregar esta información y que autorizo el tratamiento bajo los términos aquí descritos.</p>
            </div>
            <button className="btn btn-primary mt-lg" style={{ width: '100%' }} onClick={() => setShowTerms(false)}>Entendido y Cerrar</button>
          </div>
        </div>
      )}
      {/* Modal Éxito */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)' }}>
          <div className="card" style={{ 
            maxWidth: '440px', 
            width: '100%',
            textAlign: 'center', 
            padding: 'var(--space-2xl) var(--space-xl)', 
            border: '1px solid rgba(200, 149, 108, 0.3)', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Success Icon */}
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'rgba(74, 222, 128, 0.1)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto var(--space-lg)',
              border: '2px solid var(--color-success)'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h2 style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-md)', fontSize: '1.8rem', letterSpacing: '-0.02em' }}>¡Registro Exitoso!</h2>
            
            <p style={{ color: '#fff', opacity: 0.9, lineHeight: '1.6', marginBottom: 'var(--space-2xl)', fontSize: '1rem' }}>
              La información de la finca ha sido guardada con éxito. Tu esfuerzo ahora es visible para el mundo entero.
            </p>

            <button
              className="btn btn-primary"
              style={{ width: '100%', height: '58px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)' }}
              onClick={() => router.push('/')}
            >
              Finalizar y Salir
            </button>
          </div>
        </div>
      )}
    </>
  );
}
