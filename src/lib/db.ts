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
  historia_finca: string;
  altitud: number | null; // MSNM
  altitudElipsoidal: number | null;
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
  gpsAlt: number | null; // Elipsoidal
  gpsPrecision: number | null;
  presionAtmosferica: number | null;
  iluminacionAmbiental: number | null;
  consentimientoImagen: boolean;
  aceptaHabeasData: boolean;
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
