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
} from '@/lib/constants';
import MonthRangeSelector from '@/components/MonthRangeSelector';

const STEPS = ['Metadatos', 'Perfil y Ubicación', 'Dimensiones', 'Producto', 'Conservación', 'Fotos y GPS'];
const MAX_PHOTOS = 20;

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const emptyForm = (): Omit<Finca, 'id' | 'createdAt' | 'updatedAt'> => ({
  surveyorId: 0, fechaVisita: todayStr(), idFincaOficina: '',
  altitud: null, altitudElipsoidal: null, altitudMSNM: null,
  anosTradicion: null, areaTotalHa: null, areaCafeHa: null,
  cosechaPrincipalIni: null, cosechaPrincipalFin: null,
  cosechaMitacaIni: null, cosechaMitacaFin: null,
  puntajeSCA: null, sinMedicionFormal: false,
  variedades: [], otraVariedad: '', metodosBeneficio: [],
  ubicacionConservacion: '', nombreZonaConservacion: '',
  areaBosqueHa: null, numFuentesHidricas: null,
  cultivosSombra: [], otroCultivoSombra: '', manejoAgronomico: '',
  gpsLat: null, gpsLong: null, gpsAlt: null, gpsPrecision: null,
  consentimientoImagen: false, observaciones: '',
  status: 'borrador',
});

interface PhotoItem { blob: Blob; tipo: FincaFoto['tipo']; nombre: string; preview: string; }

export default function NuevaEncuestaPage() {
  const router = useRouter();
  const { surveyor, loading } = useSurveyor();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleArray = useCallback((key: 'variedades' | 'metodosBeneficio' | 'cultivosSombra', val: string) => {
    setForm((prev) => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  }, []);

  // GPS capture with 10s averaging logic
  const captureGPS = () => {
    if (!navigator.geolocation) { showToast('GPS no disponible'); return; }
    setGpsLoading(true);
    showToast('Calibrando GPS (10 seg)...');

    const samples: GeolocationCoordinates[] = [];
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        samples.push(pos.coords);
      },
      (err) => console.warn('GPS Error:', err.message),
      { enableHighAccuracy: true }
    );

    // Stop after 10 seconds
    setTimeout(async () => {
      navigator.geolocation.clearWatch(watchId);
      setGpsLoading(false);

      if (samples.length === 0) {
        showToast('No se capturaron muestras');
        return;
      }

      // Find sample with best accuracy
      const best = samples.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev), samples[0]);
      
      const lat = parseFloat(best.latitude.toFixed(7));
      const lon = parseFloat(best.longitude.toFixed(7));
      const alt = best.altitude ? parseFloat(best.altitude.toFixed(1)) : null;
      const precision = parseFloat(best.accuracy.toFixed(1));

      set('gpsLat', lat);
      set('gpsLong', lon);
      set('gpsAlt', alt);
      set('gpsPrecision', precision);
      set('altitudElipsoidal', alt);

      showToast(`Coordenada fijada (±${precision}m)`);

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
    setSaving(true);
    try {
      const now = new Date();
      const fincaId = await db.fincas.add({
        ...form, surveyorId: surveyor.id!, status, createdAt: now, updatedAt: now,
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
        <h1 className="page-title">Nueva Encuesta</h1>
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
          <div className="section-header"><span className="section-number">0</span><span className="section-title">Metadatos del Levantamiento</span></div>
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
              <label className="form-label" htmlFor="id-finca-oficina">ID Finca (Oficina)</label>
              <input id="id-finca-oficina" className="form-input" value={form.idFincaOficina} onChange={(e) => set('idFincaOficina', e.target.value)} placeholder="FNC-001" />
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Perfil y Ubicación */}
      {step === 1 && (
        <div className="card">
          <div className="section-header"><span className="section-number">1</span><span className="section-title">Perfil del Caficultor y Ubicación</span></div>
          <div className="form-group">
            <label className="form-label" htmlFor="nombre-caficultor">Nombre completo del caficultor(a)</label>
            <input id="nombre-caficultor" className="form-input" value={form.nombreCaficultor} onChange={(e) => set('nombreCaficultor', e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="nombre-finca">Nombre de la Finca</label>
            <input id="nombre-finca" className="form-input" value={form.nombreFinca} onChange={(e) => set('nombreFinca', e.target.value)} placeholder="Finca La Esperanza" />
          </div>
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="municipio">Municipio</label>
              <input id="municipio" className="form-input" value={form.municipio} onChange={(e) => set('municipio', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="vereda">Vereda/Corregimiento</label>
              <input id="vereda" className="form-input" value={form.vereda} onChange={(e) => set('vereda', e.target.value)} />
            </div>
          </div>
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="anos-tradicion">Años tradición</label>
              <input id="anos-tradicion" className="form-input" type="number" value={form.anosTradicion ?? ''} onChange={(e) => set('anosTradicion', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Dimensiones */}
      {step === 2 && (
        <div className="card">
          <div className="section-header"><span className="section-number">2</span><span className="section-title">Dimensiones y Capacidad</span></div>
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="area-total">Área total (ha)</label>
              <input id="area-total" className="form-input" type="number" step="0.1" value={form.areaTotalHa ?? ''} onChange={(e) => set('areaTotalHa', e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="area-cafe">Área café (ha)</label>
              <input id="area-cafe" className="form-input" type="number" step="0.1" value={form.areaCafeHa ?? ''} onChange={(e) => set('areaCafeHa', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
          <MonthRangeSelector 
            label="Meses cosecha principal"
            startMonth={form.cosechaPrincipalIni}
            endMonth={form.cosechaPrincipalFin}
            onChange={(start, end) => { set('cosechaPrincipalIni', start); set('cosechaPrincipalFin', end); }}
          />
          <MonthRangeSelector 
            label="Meses mitaca (Opcional)"
            startMonth={form.cosechaMitacaIni}
            endMonth={form.cosechaMitacaFin}
            onChange={(start, end) => { set('cosechaMitacaIni', start); set('cosechaMitacaFin', end); }}
          />
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="puntaje-sca">Puntaje SCA</label>
              <input id="puntaje-sca" className="form-input" type="number" step="0.5" value={form.puntajeSCA ?? ''} onChange={(e) => set('puntajeSCA', e.target.value ? Number(e.target.value) : null)} disabled={form.sinMedicionFormal} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
              <label className="check-item" style={{ width: '100%' }}>
                <input type="checkbox" checked={form.sinMedicionFormal} onChange={(e) => { set('sinMedicionFormal', e.target.checked); if (e.target.checked) set('puntajeSCA', null); }} />
                <span className={form.sinMedicionFormal ? '' : ''}>Sin medición</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Producto */}
      {step === 3 && (
        <div className="card">
          <div className="section-header"><span className="section-number">3</span><span className="section-title">El Producto</span></div>
          <div className="form-group">
            <label className="form-label">Variedades cultivadas</label>
            <div className="check-group">
              {VARIEDADES_CAFE.map((v) => (
                <label key={v} className={`check-item ${form.variedades.includes(v) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.variedades.includes(v)} onChange={() => toggleArray('variedades', v)} />{v}
                </label>
              ))}
            </div>
            <input className="form-input mt-md" placeholder="Otra variedad..." value={form.otraVariedad} onChange={(e) => set('otraVariedad', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Métodos de beneficio</label>
            <div className="check-group">
              {METODOS_BENEFICIO.map((m) => (
                <label key={m} className={`check-item ${form.metodosBeneficio.includes(m) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.metodosBeneficio.includes(m)} onChange={() => toggleArray('metodosBeneficio', m)} />{m}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Conservación */}
      {step === 4 && (
        <div className="card">
          <div className="section-header"><span className="section-number">4</span><span className="section-title">Conservación y Ambiente</span></div>
          <div className="form-group">
            <label className="form-label">Ubicación respecto a zonas de conservación</label>
            {UBICACION_CONSERVACION.map((u) => (
              <label key={u} className={`radio-card ${form.ubicacionConservacion === u ? 'selected' : ''}`}>
                <input type="radio" name="ubicacion-cons" checked={form.ubicacionConservacion === u} onChange={() => set('ubicacionConservacion', u)} />
                <span className="radio-card-title">{u}</span>
              </label>
            ))}
            {form.ubicacionConservacion && form.ubicacionConservacion !== 'No aplica' && (
              <input className="form-input mt-md" placeholder="Nombre de la zona..." value={form.nombreZonaConservacion} onChange={(e) => set('nombreZonaConservacion', e.target.value)} />
            )}
          </div>
          <div className="row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="area-bosque">Bosque protegido (ha)</label>
              <input id="area-bosque" className="form-input" type="number" step="0.1" value={form.areaBosqueHa ?? ''} onChange={(e) => set('areaBosqueHa', e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="num-fuentes">Fuentes hídricas</label>
              <input id="num-fuentes" className="form-input" type="number" value={form.numFuentesHidricas ?? ''} onChange={(e) => set('numFuentesHidricas', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Cultivos de sombra</label>
            <div className="check-group">
              {CULTIVOS_SOMBRA.map((c) => (
                <label key={c} className={`check-item ${form.cultivosSombra.includes(c) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.cultivosSombra.includes(c)} onChange={() => toggleArray('cultivosSombra', c)} />{c}
                </label>
              ))}
            </div>
            <input className="form-input mt-md" placeholder="Otro cultivo..." value={form.otroCultivoSombra} onChange={(e) => set('otroCultivoSombra', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Manejo agronómico</label>
            {MANEJO_AGRONOMICO.map((m) => (
              <label key={m.value} className={`radio-card ${form.manejoAgronomico === m.value ? 'selected' : ''}`}>
                <input type="radio" name="manejo" checked={form.manejoAgronomico === m.value} onChange={() => set('manejoAgronomico', m.value)} />
                <span className="radio-card-title">{m.label}</span>
                <span className="radio-card-desc">{m.desc}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Fotos y GPS */}
      {step === 5 && (
        <div className="card">
          <div className="section-header"><span className="section-number">5</span><span className="section-title">Fotos y GPS</span></div>
          <div className="form-group">
            <label className="form-label">Coordenadas GPS y Altitud</label>
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
                  <div className="gps-val"><span>H. Elipsoidal:</span> {form.altitudElipsoidal ? `${form.altitudElipsoidal} m` : '--'}</div>
                  <div className="gps-val"><span>Alt. MSNM:</span> {form.altitudMSNM ? `${form.altitudMSNM} m` : (navigator.onLine ? '--' : 'Pendiente (Offline)')}</div>
                </div>
                {form.gpsPrecision !== null && (
                  <div className="gps-precision">Precisión: ±{form.gpsPrecision}m</div>
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
          <div className="form-group">
            <label className="check-item" style={{ width: '100%' }}>
              <input type="checkbox" checked={form.consentimientoImagen} onChange={(e) => set('consentimientoImagen', e.target.checked)} />
              <span className={form.consentimientoImagen ? '' : ''}>Consentimiento firmado/verbal para uso de imagen</span>
            </label>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="observaciones">Observaciones</label>
            <textarea id="observaciones" className="form-textarea" value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Datos atípicos o notas..." />
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
    </>
  );
}
