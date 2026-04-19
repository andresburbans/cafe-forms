'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, type Finca, type FincaFoto, type Surveyor } from '@/lib/db';
import { blobToDataURL } from '@/lib/imageCompressor';
import { Toast, useToast } from '@/components/Toast';
import { MANEJO_AGRONOMICO } from '@/lib/constants';

interface PhotoPreview extends FincaFoto { preview: string; }

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatRange(ini: number | null | undefined, fin: number | null | undefined): string {
  if (ini == null) return 'N/A';
  if (fin == null) return MONTHS[ini];
  return `${MONTHS[ini]} - ${MONTHS[fin]}`;
}

export default function FincaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [finca, setFinca] = useState<Finca | null>(null);
  const [surveyor, setSurveyor] = useState<Surveyor | null>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const id = Number(params.id);

  useEffect(() => {
    async function load() {
      const f = await db.fincas.get(id);
      if (!f) { setLoading(false); return; }
      setFinca(f);
      const s = await db.surveyors.get(f.surveyorId);
      setSurveyor(s || null);
      const fotosRaw = await db.fotos.where('fincaId').equals(id).toArray();
      const withPreviews = await Promise.all(
        fotosRaw.map(async (foto) => ({
          ...foto,
          preview: await blobToDataURL(foto.blob),
        }))
      );
      setPhotos(withPreviews);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta finca y todas sus fotos?')) return;
    await db.fotos.where('fincaId').equals(id).delete();
    await db.fincas.delete(id);
    showToast('🗑️ Finca eliminada');
    setTimeout(() => router.push('/fincas'), 600);
  };

  if (loading) return <div className="text-center mt-lg">Cargando...</div>;
  if (!finca) return <div className="empty-state"><div className="empty-icon"></div><div className="empty-title">Finca no encontrada</div></div>;

  const manejoLabel = MANEJO_AGRONOMICO.find((m) => m.value === finca.manejoAgronomico)?.label || finca.manejoAgronomico;

  const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div style={{ marginBottom: '12px' }}>
      <div className="form-label" style={{ marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '0.95rem' }}>{value ?? 'N/A'}</div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">{finca.nombreFinca || 'Sin nombre'}</h1>
            <p className="page-subtitle">{finca.nombreCaficultor}</p>
          </div>
          <span className={`badge ${finca.status === 'completo' ? 'badge--complete' : 'badge--draft'}`}>
            {finca.status === 'completo' ? 'Completa' : 'Borrador'}
          </span>
        </div>
      </div>

      {/* Metadatos */}
      <div className="card mb-md">
        <div className="section-header"><span className="section-number">0</span><span className="section-title">Metadatos</span></div>
        <Field label="Encuestador" value={surveyor?.nombre} />
        <div className="row-2">
          <Field label="Fecha visita" value={finca.fechaVisita} />
          <Field label="ID Finca" value={finca.idFincaOficina} />
        </div>
        <div className="row-2">
          <Field label="Rol Informante" value={finca.rol_informante} />
          <Field label="Estado Sincronización" value={finca.sync_status} />
        </div>
      </div>

      {/* Sección 1 */}
      <div className="card mb-md">
        <div className="section-header"><span className="section-number">1</span><span className="section-title">Ubicación</span></div>
        <div className="row-2">
          <Field label="Departamento" value={finca.departamento} />
          <Field label="Municipio" value={finca.municipio} />
        </div>
        <div className="row-2">
          <Field label="Vereda" value={finca.vereda} />
          <Field label="Altitud (m.s.n.m.)" value={finca.altitud} />
        </div>
        <div className="row-2">
          <Field label="Años tradición" value={finca.anosTradicion} />
          <Field label="Género / Liderazgo" value={finca.genero_liderazgo} />
        </div>
        <div className="row-2">
          <Field label="WhatsApp" value={finca.whatsapp} />
          <Field label="Correo" value={finca.correo} />
        </div>
        <Field label="Historia de la finca" value={finca.historia_finca} />
      </div>

      {/* Sección 2 */}
      <div className="card mb-md">
        <div className="section-header"><span className="section-number">2</span><span className="section-title">Dimensiones</span></div>
        <div className="row-2">
          <Field label="Área total (ha)" value={finca.areaTotalHa} />
          <Field label="Área café (ha)" value={finca.areaCafeHa} />
        </div>
        <div className="row-2">
          <Field label="Prod. Anual (kg)" value={finca.produccion_anual_kg} />
          <Field label="Edad Cafetales (años)" value={finca.edad_promedio_cafetales} />
        </div>
        <Field label="Infraestructura de secado" value={[...finca.infraestructura_secado, finca.otraInfraestructuraSecado].filter(Boolean).join(', ')} />
        <div className="row-2">
          <Field label="Cosecha principal" value={formatRange(finca.cosechaPrincipalIni, finca.cosechaPrincipalFin)} />
          <Field label="Mitaca" value={formatRange(finca.cosechaMitacaIni, finca.cosechaMitacaFin)} />
        </div>
        <Field label="Puntaje SCA" value={finca.sinMedicionFormal ? 'Sin medición formal' : finca.puntajeSCA} />
      </div>

      {/* Sección 3 */}
      <div className="card mb-md">
        <div className="section-header"><span className="section-number">3</span><span className="section-title">Producto</span></div>
        <Field label="Variedades" value={[...finca.variedades, finca.otraVariedad].filter(Boolean).join(', ') || 'N/A'} />
        <Field label="Métodos beneficio" value={finca.metodosBeneficio.join(', ') || 'N/A'} />
        <Field label="Tipos de fermentación" value={[...finca.tipos_fermentacion, finca.otroTipoFermentacion].filter(Boolean).join(', ')} />
        <Field label="Perfil de taza" value={[...finca.perfil_taza, finca.otroPerfilTaza].filter(Boolean).join(', ')} />
        <Field label="Certificaciones" value={[...finca.certificaciones, finca.otraCertificacion].filter(Boolean).join(', ')} />
      </div>

      {/* Sección 4 */}
      <div className="card mb-md">
        <div className="section-header"><span className="section-number">4</span><span className="section-title">Conservación</span></div>
        <Field label="Zona conservación" value={finca.ubicacionConservacion || 'N/A'} />
        {finca.nombreZonaConservacion && <Field label="Nombre zona" value={finca.nombreZonaConservacion} />}
        <div className="row-2">
          <Field label="Bosque protegido (ha)" value={finca.areaBosqueHa} />
          <Field label="Fuentes hídricas" value={finca.numFuentesHidricas} />
        </div>
        <Field label="Cultivos sombra" value={[...finca.cultivosSombra, finca.otroCultivoSombra].filter(Boolean).join(', ') || 'N/A'} />
        <Field label="Manejo agronómico" value={manejoLabel || 'N/A'} />
        <Field label="Manejo aguas mieles" value={[finca.manejo_aguas_mieles, finca.otroManejoAguasMieles].filter(Boolean).join(' - ')} />
        <Field label="Fauna y biodiversidad" value={finca.fauna_biodiversidad} />
      </div>

      {/* GPS */}
      <div className="card mb-md">
        <div className="section-header"><span className="section-number">5</span><span className="section-title">GPS y Fotos</span></div>
        {finca.gpsLat !== null && finca.gpsLong !== null ? (
          <div className="gps-coords mb-md">Lat: {finca.gpsLat} · Long: {finca.gpsLong}</div>
        ) : <Field label="GPS" value="No capturado" />}
        <Field label="Consentimiento imagen" value={finca.consentimientoImagen ? 'Sí' : 'No'} />
        {finca.observaciones && <Field label="Observaciones" value={finca.observaciones} />}
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="card mb-md">
          <div className="form-label mb-md">Fotografías ({photos.length})</div>
          <div className="photo-grid">
            {photos.map((p) => (
              <div key={p.id} className="photo-thumb">
                <img src={p.preview} alt={p.nombre} />
                <div className="photo-label">{p.tipo} · {p.tamanioKB}KB</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button className="btn btn-secondary" onClick={() => router.push('/fincas')} style={{ flex: 1 }}>Volver</button>
        <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
      </div>

      {toast && <Toast message={toast} />}
    </>
  );
}
