import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db, type Finca, type Surveyor, type FincaFoto } from './db';

// ── Flat row for CSV/XLSX ──────────────────────────
interface ExportRow {
  id: number;
  encuestador: string;
  fechaVisita: string;
  idFincaOficina: string;
  nombreCaficultor: string;
  nombreFinca: string;
  municipio: string;
  vereda: string;
  altitud: number | null;
  anosTradicion: number | null;
  areaTotalHa: number | null;
  areaCafeHa: number | null;
  mesesCosecha: string;
  mesesMitaca: string;
  puntajeSCA: number | null;
  sinMedicionFormal: string;
  variedades: string;
  otraVariedad: string;
  metodosBeneficio: string;
  ubicacionConservacion: string;
  nombreZonaConservacion: string;
  areaBosqueHa: number | null;
  numFuentesHidricas: number | null;
  cultivosSombra: string;
  otroCultivoSombra: string;
  manejoAgronomico: string;
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
      idFincaOficina: f.idFincaOficina,
      nombreCaficultor: f.nombreCaficultor,
      nombreFinca: f.nombreFinca,
      municipio: f.municipio,
      vereda: f.vereda,
      altitud: f.altitud,
      anosTradicion: f.anosTradicion,
      areaTotalHa: f.areaTotalHa,
      areaCafeHa: f.areaCafeHa,
      mesesCosecha: f.mesesCosecha,
      mesesMitaca: f.mesesMitaca,
      puntajeSCA: f.puntajeSCA,
      sinMedicionFormal: f.sinMedicionFormal ? 'Sí' : 'No',
      variedades: f.variedades.join(', '),
      otraVariedad: f.otraVariedad,
      metodosBeneficio: f.metodosBeneficio.join(', '),
      ubicacionConservacion: f.ubicacionConservacion,
      nombreZonaConservacion: f.nombreZonaConservacion,
      areaBosqueHa: f.areaBosqueHa,
      numFuentesHidricas: f.numFuentesHidricas,
      cultivosSombra: f.cultivosSombra.join(', '),
      otroCultivoSombra: f.otroCultivoSombra,
      manejoAgronomico: f.manejoAgronomico,
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
