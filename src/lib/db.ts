import Dexie, { type EntityTable } from 'dexie';

// ── Types ──────────────────────────────────────────
export interface Surveyor {
  id?: number;
  nombre: string;
  documento: string;
  telefono: string;
  organizacion: string;
  createdAt: Date;
}

export interface Finca {
  id?: number;
  surveyorId: number;
  fechaVisita: string;
  idFincaOficina: string;
  // Sección 1
  nombreCaficultor: string;
  nombreFinca: string;
  municipio: string;
  vereda: string;
  altitud: number | null; // MSNM
  altitudElipsoidal: number | null;
  altitudMSNM: number | null;
  anosTradicion: number | null;
  // Sección 2
  areaTotalHa: number | null;
  areaCafeHa: number | null;
  cosechaPrincipalIni: number | null; // 0-11 (Ene-Dic)
  cosechaPrincipalFin: number | null;
  cosechaMitacaIni: number | null;
  cosechaMitacaFin: number | null;
  puntajeSCA: number | null;
  sinMedicionFormal: boolean;
  // Sección 3
  variedades: string[];
  otraVariedad: string;
  metodosBeneficio: string[];
  // Sección 4
  ubicacionConservacion: string;
  nombreZonaConservacion: string;
  areaBosqueHa: number | null;
  numFuentesHidricas: number | null;
  cultivosSombra: string[];
  otroCultivoSombra: string;
  manejoAgronomico: string;
  // Sección 5 - GPS
  gpsLat: number | null;
  gpsLong: number | null;
  gpsAlt: number | null; // Elipsoidal
  gpsPrecision: number | null;
  consentimientoImagen: boolean;
  observaciones: string;
  // Meta
  createdAt: Date;
  updatedAt: Date;
  status: 'borrador' | 'completo';
}

export interface FincaFoto {
  id?: number;
  fincaId: number;
  tipo: 'retrato' | 'panoramica' | 'infraestructura' | 'extra';
  blob: Blob;
  nombre: string;
  tamanioKB: number;
  createdAt: Date;
}

// ── Database ───────────────────────────────────────
class CafeDB extends Dexie {
  surveyors!: EntityTable<Surveyor, 'id'>;
  fincas!: EntityTable<Finca, 'id'>;
  fotos!: EntityTable<FincaFoto, 'id'>;

  constructor() {
    super('CafeProyDB');
    this.version(1).stores({
      surveyors: '++id, nombre',
      fincas: '++id, surveyorId, status, createdAt',
      fotos: '++id, fincaId, tipo',
    });
  }
}

export const db = new CafeDB();
