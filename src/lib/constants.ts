// ── Survey form constants ──────────────────────────

export const VARIEDADES_CAFE = [
  'Caturra',
  'Castillo',
  'Colombia',
  'Gesha',
  'Bourbon rosado',
  'Catuay',
  'Catimor',
  'Tambo',
  'Tabi',
  'Typica',
] as const;

export const METODOS_BENEFICIO = [
  'Lavado tradicional',
  'Natural',
  'Honey (Miel)',
  'Fermentaciones prolongadas / experimentales',
] as const;

export const UBICACION_CONSERVACION = [
  'Dentro de zona de conservación',
  'Cerca/Área de amortiguación',
  'No aplica',
] as const;

export const CULTIVOS_SOMBRA = [
  'Guamo / Ingas',
  'Plátano / Banano',
  'Cítricos',
  'Maderables',
  'Aguacate',
] as const;

export const MANEJO_AGRONOMICO = [
  { value: 'organico_certificado', label: 'Orgánico Certificado', desc: 'Uso exclusivo de insumos orgánicos y biológicos, con certificación.' },
  { value: 'agroecologico', label: 'Agroecológico / En transición', desc: 'Prácticas orgánicas, sin químicos, pero sin certificación.' },
  { value: 'convencional_responsable', label: 'Convencional Responsable', desc: 'Uso controlado y racional de agroquímicos y fertilizantes de síntesis.' },
  { value: 'convencional_intensivo', label: 'Convencional Intensivo', desc: 'Uso regular y estándar de químicos.' },
] as const;

export const FOTO_TIPOS = [
  { value: 'retrato' as const, label: 'Retrato del caficultor(a)', desc: 'Buena luz, sonriendo' },
  { value: 'panoramica' as const, label: 'Panorámica de cafetales', desc: 'Vista general del lote' },
  { value: 'infraestructura' as const, label: 'Infraestructura', desc: 'Secadero, beneficio o bosque' },
  { value: 'extra' as const, label: 'Foto adicional', desc: 'Cualquier dato relevante' },
] as const;
