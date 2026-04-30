'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, type Finca, type FincaFoto } from '@/lib/db';
import { useSurveyor } from '@/hooks/useSurveyor';
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
  status: 'borrador',
});

interface PhotoItem { blob: Blob; tipo: FincaFoto['tipo']; nombre: string; preview: string; }

export default function NuevaEncuestaPage() {
  const router = useRouter();
  const { surveyor, loading } = useSurveyor();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...emptyForm(), aceptaHabeasData: false });
  const [showTerms, setShowTerms] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const captureGPS = async () => {
    if (!navigator.geolocation) { showToast('GPS no disponible'); return; }
    setGpsLoading(true);
    showToast('Calibrando sensores y GPS (10 seg)...');

    // Intentar captura de barómetro (si el dispositivo lo permite)
    try {
      if ('PressureSensor' in window) {
        // @ts-ignore
        const sensor = new PressureSensor({ frequency: 1 });
        sensor.onreading = () => {
          set('presionAtmosferica', parseFloat(sensor.pressure.toFixed(2)));
          sensor.stop();
        };
        sensor.start();
      }
    } catch (e) {}

    // Intentar captura de luz ambiental
    try {
      if ('AmbientLightSensor' in window) {
        // @ts-ignore
        const light = new AmbientLightSensor();
        light.onreading = () => {
          set('iluminacionAmbiental', light.illuminance);
          light.stop();
        };
        light.start();
      }
    } catch (e) {}

    const samples: GeolocationCoordinates[] = [];
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        samples.push(pos.coords);
      },
      (err) => console.warn('GPS Error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Stop after 10 seconds
    setTimeout(async () => {
      navigator.geolocation.clearWatch(watchId);
      setGpsLoading(false);

      if (samples.length === 0) {
        showToast('No se capturaron muestras de GPS');
        return;
      }

      // Ordenar por precisión y tomar la mejor muestra
      const best = samples.sort((a, b) => a.accuracy - b.accuracy)[0];

      const lat = parseFloat(best.latitude.toFixed(7));
      const lon = parseFloat(best.longitude.toFixed(7));
      const alt = best.altitude !== null ? parseFloat(best.altitude.toFixed(1)) : null;
      const precision = parseFloat(best.accuracy.toFixed(1));

      set('gpsLat', lat);
      set('gpsLong', lon);
      set('gpsAlt', alt);
      set('gpsPrecision', precision);
      set('altitudElipsoidal', alt);

      showToast(`Geodata fijada (±${precision}m)`);

      // Try to get MSNM via Open-Elevation (if online)
      if (navigator.onLine) {
        try {
          const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
          const data = await res.json();
          if (data.results?.[0]?.elevation) {
            const msnm = Math.round(data.results[0].elevation);
            set('altitudMSNM', msnm);
            set('altitud', msnm);
          }
        } catch (e) {
          console.error('Elevation API error:', e);
        }
      }
    }, 10000);
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
    if (!surveyor?.id) { showToast('Configura tu perfil primero'); return; }
    if (status === 'completo' && !form.aceptaHabeasData) {
      showToast('Debes aceptar el tratamiento de datos para finalizar');
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      const finalForm = {
        ...form,
        timestamp_fin: now.toISOString(),
        sync_status: navigator.onLine ? 'online' : 'offline',
      };
      const fincaId = await db.fincas.add({
        ...finalForm, surveyorId: surveyor.id!, status, createdAt: now, updatedAt: now,
      } as Finca) as number;
      for (const photo of photos) {
        await db.fotos.add({
          fincaId: fincaId, tipo: photo.tipo, blob: photo.blob,
          nombre: photo.nombre, tamanioKB: Math.round(photo.blob.size / 1024), createdAt: now,
        });
      }
      showToast(status === 'completo' ? 'Encuesta guardada' : 'Borrador guardado');
      setTimeout(() => router.push('/fincas'), 800);
    } catch (err) {
      showToast('Error guardando');
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center mt-lg">Cargando...</div>;
  if (!surveyor) {
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
        <p className="page-subtitle">{STEPS[step]} ({step + 1}/{STEPS.length})</p>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((_, i) => (
          <div key={i} className={`stepper-step ${i === step ? 'active' : i < step ? 'done' : ''}`} />
        ))}
      </div>

      {/* Step 0: Metadatos */}
      {step === 0 && (
        <div className="card">
          <div className="section-header"><span className="section-number">0</span><span className="section-title">Información general</span></div>
          <div className="form-group">
            <label className="form-label">Encuestador</label>
            <input className="form-input" value={surveyor.nombre} disabled />
          </div>
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

      {/* Step 1: Perfil y Ubicación */}
      {step === 1 && (
        <div className="card">
          <div className="section-header"><span className="section-number">1</span><span className="section-title">Perfil del caficultor y ubicación</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Queremos conocer tu historia!</b> ☕<br />
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
            <label className="form-label" htmlFor="historia-finca">Historia de la Finca (Storytelling)</label>
            <textarea id="historia-finca" className="form-textarea" value={form.historia_finca} onChange={(e) => set('historia_finca', e.target.value)} maxLength={5000} placeholder="Cuenta la historia de tu finca, tu familia y tu café... ¿Qué los hace especial?" />
            <p className="form-hint" style={{ textAlign: 'right' }}>{form.historia_finca.length}/5000</p>
          </div>
        </div>
      )}

      {/* Step 2: Dimensiones */}
      {step === 2 && (
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

      {/* Step 3: Producto */}
      {step === 3 && (
        <div className="card">
          <div className="section-header"><span className="section-number">3</span><span className="section-title">El café</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Aquí es donde ocurre la magia!</b> ✨<br />
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

      {/* Step 4: Conservación */}
      {step === 4 && (
        <div className="card">
          <div className="section-header"><span className="section-number">4</span><span className="section-title">Sostenibilidad ambiental</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Tu compromiso con la naturaleza aumenta el valor de tu café!</b> 🌿<br />
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

      {/* Step 5: Fotos y GPS */}
      {step === 5 && (
        <div className="card">
          <div className="section-header"><span className="section-number">5</span><span className="section-title">Geodata y multimedia</span></div>

          <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              <b>¡Hemos llegado al final, te agradecemos!</b> 🎉<br />
              Un último paso y muy importante: Las fotos y la ubicación exacta validan el origen de tu café y permiten que el comprador "visite" tu finca virtualmente desde cualquier lugar del mundo.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Coordenadas GPS y altitud</label>
            <p className="form-hint mb-md">Nota: Para asegurar calidad de la coordenada, se capturará por 10 segundos.</p>
            <button type="button" className="gps-btn-premium" onClick={captureGPS} disabled={gpsLoading}>
              <span className={`gps-indicator ${gpsLoading ? 'scanning' : ''}`} />
              {gpsLoading ? 'Calibrando precisión...' : 'Capturar Coordenada'}
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
            <label className="form-label">Fotografías ({photos.length}/{MAX_PHOTOS})</label>
            <p className="form-hint mb-md">1ª=Retrato, 2ª=Panorámica, 3ª=Infraestructura, resto=Extra</p>
            <div className="photo-grid">
              {photos.map((p, i) => (
                <div key={i} className="photo-thumb">
                  <img src={p.preview} alt={p.nombre} />
                  <div className="photo-label">{p.tipo}</div>
                  <div className="photo-thumb-overlay" onClick={() => removePhoto(i)}>Eliminar</div>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <div className="photo-add" onClick={() => fileRef.current?.click()}>
                  <span>Agregar Foto</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={handlePhoto} />
          </div>
          <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
            <label className="check-item" style={{ width: '100%', marginBottom: 'var(--space-sm)' }}>
              <input type="checkbox" checked={form.consentimientoImagen} onChange={(e) => set('consentimientoImagen', e.target.checked)} />
              <span style={{ fontWeight: '500' }}>Autorizo el uso de mi imagen y fotos de la finca</span>
            </label>
            
            <label className="check-item" style={{ width: '100%', marginBottom: 'var(--space-sm)' }}>
              <input type="checkbox" checked={form.aceptaHabeasData} onChange={(e) => set('aceptaHabeasData', e.target.checked)} />
              <span style={{ fontWeight: '500' }}>Acepto el tratamiento de mis datos personales</span>
            </label>
            
            <button type="button" onClick={() => setShowTerms(true)} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.8rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
              Leer términos y condiciones (Habeas Data)
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="observaciones">Observaciones finales</label>
            <textarea id="observaciones" className="form-textarea" value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="¿Algún detalle extra que debamos saber?" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-between mt-lg gap-sm">
        {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Anterior</button>}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 && <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Siguiente</button>}
        {step === STEPS.length - 1 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => handleSave('borrador')} disabled={saving}>Borrador</button>
            <button className="btn btn-primary" onClick={() => handleSave('completo')} disabled={saving}>Guardar</button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} />}

      {/* Modal Habeas Data */}
      {showTerms && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)' }}>
          <div className="card" style={{ maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', position: 'relative', border: '1px solid var(--color-accent)' }}>
            <h2 style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-md)' }}>Tratamiento de Datos Personales</h2>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
              <p>De conformidad con la <b>Ley 1581 de 2012 (Habeas Data)</b>, yo, en calidad de titular de la información, autorizo de manera libre, previa, expresa e informada a <b>CaféProy</b> para realizar el tratamiento de mis datos personales y de mi unidad productiva (finca).</p>
              
              <p style={{ marginTop: 'var(--space-sm)' }}><b>Finalidades:</b><br/>
              - Caracterización técnica y social del caficultor.<br/>
              - Promoción comercial y marketing de cafés de especialidad.<br/>
              - Geolocalización para trazabilidad de origen.<br/>
              - Uso de material fotográfico para vitrinas comerciales.</p>

              <p style={{ marginTop: 'var(--space-sm)' }}><b>Mis Derechos:</b><br/>
              Entiendo que puedo conocer, actualizar, rectificar y solicitar la supresión de mis datos en cualquier momento. CaféProy garantiza la seguridad y confidencialidad de la información recolectada mediante protocolos de cifrado local y protección de bases de datos.</p>
              
              <p style={{ marginTop: 'var(--space-sm)' }}>Al marcar la casilla de aceptación, confirmo que soy el titular o estoy facultado para entregar esta información y que autorizo el tratamiento bajo los términos aquí descritos.</p>
            </div>
            <button className="btn btn-primary mt-lg" style={{ width: '100%' }} onClick={() => setShowTerms(false)}>Entendido y Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
