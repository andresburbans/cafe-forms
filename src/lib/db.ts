import Dexie, { type EntityTable } from 'dexie';

// ── Types ──────────────────────────────────────────
export interface Surveyor {
  id?: number;
  nombre: string;
  email: string;
  passwordHash: string;
  documento: string;
  telefono: string;
  organizacion: string;
  createdAt: Date;
}

export interface Finca {
  id?: number;
  surveyorId: number;
  fechaVisita: string;
  idFincaUnico: string;
  timestamp_inicio: string | null;
  timestamp_fin: string | null;
  sync_status: 'online' | 'offline' | null;
  accuracy_gps: number | null;
  rol_informante: string;
  // Sección 1
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
  nucleoFamiliar: number | null;
  historia_finca: string;
  altitud: number | null; // MSNM
  altitudMSNM: number | null;
  anosTradicion: number | null;
  // Sección 2
  areaTotalHa: number | null;
  areaCafeHa: number | null;
  plantasProduccion: number | null;
  plantasLevante: number | null;
  plantasZoca: number | null;
  cosechaPrincipalIni: number | null; // 0-11 (Ene-Dic)
  cosechaPrincipalFin: number | null;
  cosechaMitacaIni: number | null;
  cosechaMitacaFin: number | null;
  puntajeSCA: number | null;
  sinMedicionFormal: boolean;
  sinPerfilTaza: boolean;
  sinCertificaciones: boolean;
  produccion_anual_kg: number | null;
  edad_promedio_cafetales: number | null;
  infraestructura_secado: string[];
  otraInfraestructuraSecado: string;
  // Sección 3
  variedades: string[];
  otraVariedad: string;
  metodosBeneficio: string[];
  otroMetodoBeneficio: string;
  tipos_fermentacion: string[];
  otroTipoFermentacion: string;
  perfil_taza: string[];
  otroPerfilTaza: string;
  certificaciones: string[];
  otraCertificacion: string;
  // Sección 4
  ubicacionConservacion: string;
  nombreZonaConservacion: string;
  areaBosqueHa: number | null;
  numFuentesHidricas: number | null;
  tipos_fuentes_hidricas: string[];
  otroTipoFuenteHidrica: string;
  sinFuentesHidricas: boolean;
  cultivosSombra: string[];
  otroCultivoSombra: string;
  manejoAgronomico: string;
  manejo_aguas_mieles: string;
  otroManejoAguasMieles: string;
  fauna_biodiversidad: string[];
  otraFaunaBiodiversidad: string;
  sinFaunaBiodiversidad: boolean;
  // Sección 5 - GPS
  gpsLat: number | null;
  gpsLong: number | null;
  gpsPrecision: number | null;
  presionAtmosferica: number | null;
  iluminacionAmbiental: number | null;
  consentimientoImagen: boolean;
  aceptaHabeasData: boolean;
  observaciones: string;
  origenEncuesta: 'particular' | 'encuestador';
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
    this.version(2).stores({
      surveyors: '++id, nombre, documento',
      fincas: '++id, surveyorId, status, createdAt, origenEncuesta',
      fotos: '++id, fincaId, tipo',
    });
    this.version(3).stores({
      surveyors: '++id, nombre, documento, email',
      fincas: '++id, surveyorId, status, createdAt, origenEncuesta',
      fotos: '++id, fincaId, tipo',
    });
    this.version(4).stores({
      surveyors: '++id, nombre, documento, email',
      fincas: '++id, surveyorId, status, createdAt, origenEncuesta, sync_status',
      fotos: '++id, fincaId, tipo',
    });
  }
}

// ── Console Admin Utility ──────────────────────────
async function hashPwd(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export const db = new CafeDB();

if (typeof window !== 'undefined') {
  (window as any).cafeAdmin = {
    addSurveyor: async (data: { nombre: string; email: string; password: string; documento?: string; telefono?: string; organizacion?: string }) => {
      const existing = await db.surveyors.where('email').equals(data.email).first();
      if (existing) { console.warn('Ya existe un encuestador con ese email'); return; }
      const hash = await hashPwd(data.password);
      const id = await db.surveyors.add({
        nombre: data.nombre, email: data.email, passwordHash: hash,
        documento: data.documento || '', telefono: data.telefono || '',
        organizacion: data.organizacion || '', createdAt: new Date(),
      });
      console.log(`Encuestador creado con ID: ${id}`);
    },
    listSurveyors: async () => {
      const all = await db.surveyors.toArray();
      console.table(all.map(s => ({ id: s.id, nombre: s.nombre, email: s.email, organizacion: s.organizacion })));
    },
    hashPassword: hashPwd,
  };
}
