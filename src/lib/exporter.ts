import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db, type Finca, type Surveyor, type FincaFoto } from './db';

// ── Flat row for CSV/XLSX ──────────────────────────
interface ExportRow {
  id: number;
  encuestador: string;
  fechaVisita: string;
  idFincaUnico: string;
  timestamp_inicio: string | null;
  timestamp_fin: string | null;
  sync_status: string | null;
  accuracy_gps: number | null;
  rol_informante: string;
  nombreCaficultor: string;
  nombreFinca: string;
  departamento: string;
  municipio: string;
  vereda: string;
  whatsapp: string;
  correo: string;
  instagram: string;
  facebook: string;
  genero_liderazgo: string;
  historia_finca: string;
  altitud: number | null;
  anosTradicion: number | null;
  areaTotalHa: number | null;
  areaCafeHa: number | null;
  cosechaPrincipalIni: number | null;
  cosechaPrincipalFin: number | null;
  cosechaMitacaIni: number | null;
  cosechaMitacaFin: number | null;
  produccion_anual_kg: number | null;
  edad_promedio_cafetales: number | null;
  infraestructura_secado: string;
  otraInfraestructuraSecado: string;
  puntajeSCA: number | null;
  sinMedicionFormal: string;
  variedades: string;
  otraVariedad: string;
  metodosBeneficio: string;
  tipos_fermentacion: string;
  otroTipoFermentacion: string;
  perfil_taza: string;
  otroPerfilTaza: string;
  certificaciones: string;
  otraCertificacion: string;
  ubicacionConservacion: string;
  nombreZonaConservacion: string;
  areaBosqueHa: number | null;
  numFuentesHidricas: number | null;
  cultivosSombra: string;
  otroCultivoSombra: string;
  manejoAgronomico: string;
  manejo_aguas_mieles: string;
  otroManejoAguasMieles: string;
  fauna_biodiversidad: string;
  otraFaunaBiodiversidad: string;
  tipos_fuentes_hidricas: string;
  otroTipoFuenteHidrica: string;
  altitudMSNM: number | null;
  altitudElipsoidal: number | null;
  gpsAlt: number | null;
  gpsPrecision: number | null;
  presionAtmosferica: number | null;
  iluminacionAmbiental: number | null;
  aceptaHabeasData: string;
  gpsLat: number | null;
  gpsLong: number | null;
  consentimientoImagen: string;
  observaciones: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  numFotos: number;
}

async function buildRows(): Promise<ExportRow[]> {
  const fincas = await db.fincas.toArray();
  const surveyors = await db.surveyors.toArray();
  const surveyorMap = new Map<number, Surveyor>();
  surveyors.forEach((s) => { if (s.id) surveyorMap.set(s.id, s); });

  const rows: ExportRow[] = [];

  for (const f of fincas) {
    const fotos = await db.fotos.where('fincaId').equals(f.id!).count();
    const surveyor = surveyorMap.get(f.surveyorId);

    rows.push({
      id: f.id!,
      encuestador: surveyor?.nombre || 'N/A',
      fechaVisita: f.fechaVisita,
      idFincaUnico: f.idFincaUnico,
      timestamp_inicio: f.timestamp_inicio,
      timestamp_fin: f.timestamp_fin,
      sync_status: f.sync_status,
      accuracy_gps: f.accuracy_gps,
      rol_informante: f.rol_informante,
      nombreCaficultor: f.nombreCaficultor,
      nombreFinca: f.nombreFinca,
      departamento: f.departamento,
      municipio: f.municipio,
      vereda: f.vereda,
      whatsapp: f.whatsapp,
      correo: f.correo,
      instagram: f.instagram,
      facebook: f.facebook,
      genero_liderazgo: f.genero_liderazgo,
      historia_finca: f.historia_finca,
      altitud: f.altitud,
      anosTradicion: f.anosTradicion,
      areaTotalHa: f.areaTotalHa,
      areaCafeHa: f.areaCafeHa,
      cosechaPrincipalIni: f.cosechaPrincipalIni,
      cosechaPrincipalFin: f.cosechaPrincipalFin,
      cosechaMitacaIni: f.cosechaMitacaIni,
      cosechaMitacaFin: f.cosechaMitacaFin,
      produccion_anual_kg: f.produccion_anual_kg,
      edad_promedio_cafetales: f.edad_promedio_cafetales,
      infraestructura_secado: f.infraestructura_secado.join(', '),
      otraInfraestructuraSecado: f.otraInfraestructuraSecado,
      puntajeSCA: f.puntajeSCA,
      sinMedicionFormal: f.sinMedicionFormal ? 'Sí' : 'No',
      variedades: f.variedades.join(', '),
      otraVariedad: f.otraVariedad,
      metodosBeneficio: f.metodosBeneficio.join(', '),
      tipos_fermentacion: f.tipos_fermentacion.join(', '),
      otroTipoFermentacion: f.otroTipoFermentacion,
      perfil_taza: f.perfil_taza.join(', '),
      otroPerfilTaza: f.otroPerfilTaza,
      certificaciones: f.certificaciones.join(', '),
      otraCertificacion: f.otraCertificacion,
      ubicacionConservacion: f.ubicacionConservacion,
      nombreZonaConservacion: f.nombreZonaConservacion,
      areaBosqueHa: f.areaBosqueHa,
      numFuentesHidricas: f.numFuentesHidricas,
      cultivosSombra: f.cultivosSombra.join(', '),
      otroCultivoSombra: f.otroCultivoSombra,
      manejoAgronomico: f.manejoAgronomico,
      manejo_aguas_mieles: f.manejo_aguas_mieles,
      otroManejoAguasMieles: f.otroManejoAguasMieles,
      fauna_biodiversidad: f.fauna_biodiversidad.join(', '),
      otraFaunaBiodiversidad: f.otraFaunaBiodiversidad,
      tipos_fuentes_hidricas: f.tipos_fuentes_hidricas.join(', '),
      otroTipoFuenteHidrica: f.otroTipoFuenteHidrica,
      altitudMSNM: f.altitudMSNM,
      altitudElipsoidal: f.altitudElipsoidal,
      gpsAlt: f.gpsAlt,
      gpsPrecision: f.gpsPrecision,
      presionAtmosferica: f.presionAtmosferica,
      iluminacionAmbiental: f.iluminacionAmbiental,
      aceptaHabeasData: f.aceptaHabeasData ? 'Sí' : 'No',
      gpsLat: f.gpsLat,
      gpsLong: f.gpsLong,
      consentimientoImagen: f.consentimientoImagen ? 'Sí' : 'No',
      observaciones: f.observaciones,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      numFotos: fotos,
    });
  }

  return rows;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV Export ──────────────────────────────────────
export async function exportCSV() {
  const rows = await buildRows();
  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `cafe_fincas_${date}.csv`);
}

// ── XLSX Export ────────────────────────────────────
export async function exportXLSX() {
  const rows = await buildRows();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fincas');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `cafe_fincas_${date}.xlsx`);
}

// ── JSON Export (for DB import) ────────────────────
export async function exportJSON() {
  const fincas = await db.fincas.toArray();
  const surveyors = await db.surveyors.toArray();
  const fotosRaw = await db.fotos.toArray();

  // Convert blobs to base64 for JSON serialization
  const fotos = await Promise.all(
    fotosRaw.map(async (f) => {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f.blob);
      });
      return { ...f, blob: base64 };
    })
  );

  const data = { exportDate: new Date().toISOString(), surveyors, fincas, fotos };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `cafe_backup_${date}.json`);
}
