// ── Survey form constants ──────────────────────────

export const VARIEDADES_CAFE = [
  'Bourbón amarillo',
  'Bourbón rojo',
  'Bourbón rosado',
  'Catuai',
  'Caturra',
  'Caturra chiroso',
  'Castillo',
  'Cenicafe 1',
  'Colombia',
  'Catimor',
  'Geisha',
  'Wush wush',
  'Maragogype',
  'Papayo',
  'Tambo',
  'Tabi',
  'Típica (Pajarito)',
  'Otro',
] as const;

export const METODOS_BENEFICIO = [
  'Lavado tradicional',
  'Lavado doble',
  'Proceso natural',
  'Proceso Honey',
  'Fermentaciones prolongadas',
  'Otro',
] as const;

export const UBICACION_CONSERVACION = [
  { value: 'dentro', label: 'Dentro de zona protegida', desc: 'Mi finca está adentro de un Parque Nacional o Reserva Natural.' },
  { value: 'cerca', label: 'Cerca (Amortiguación)', desc: 'Mi finca está muy cerca del borde de una zona protegida.' },
  { value: 'fuera', label: 'Fuera de zonas protegidas', desc: 'Mi finca está lejos de cualquier parque o reserva protegida.' },
  { value: 'desconocido', label: 'No tengo conocimiento', desc: 'No estoy seguro si mi finca está en una zona protegida o no.' },
] as const;

export const CULTIVOS_SOMBRA = [
  'Guamo / Ingas',
  'Plátano / Banano',
  'Cítricos',
  'Maderables',
  'Aguacate',
  'Sin sombra',
  'Otro',

] as const;

export const MANEJO_AGRONOMICO = [
  { value: 'convencional_intensivo', label: 'Convencional Intensivo', desc: 'Uso regular y estándar de químicos.' },
  { value: 'convencional_responsable', label: 'Convencional Responsable', desc: 'Uso controlado y racional de agroquímicos y fertilizantes de síntesis.' },
  { value: 'agroecologico', label: 'Agroecológico / En transición', desc: 'Prácticas orgánicas, sin químicos, pero sin certificación.' },
  { value: 'organico_certificado', label: 'Orgánico Certificado', desc: 'Uso exclusivo de insumos orgánicos y biológicos, con certificación.' },

] as const;

export const FOTO_TIPOS = [
  { value: 'retrato' as const, label: 'Retrato del caficultor(a)', desc: 'Buena luz, sonriendo' },
  { value: 'panoramica' as const, label: 'Panorámica de cafetales', desc: 'Vista general del lote' },
  { value: 'infraestructura' as const, label: 'Infraestructura', desc: 'Secadero, beneficio o bosque' },
  { value: 'extra' as const, label: 'Foto adicional', desc: 'Cualquier dato relevante' },
] as const;

export const ROLES_INFORMANTE = [
  'Propietario',
  'Administrador',
  'Trabajador',
  'Familiar',
] as const;

export const GENERO_LIDERAZGO = [
  'Femenino',
  'Masculino',
  'LGTBIQ+',
  'Empresa Familiar',
] as const;

export const INFRAESTRUCTURA_SECADO = [
  'Invernadero parabólico',
  'Secadero de techo corredizo',
  'Secador mecánico',
  'Al aire libre',
  'Patio de secado',
  'Camas africanas',
  'Guardiola (Secador mecanico rotatorio)',
  'Otro',
] as const;

export const TIPOS_FERMENTACION = [
  'Sin fermentación',
  'Aeróbica',
  'Anaeróbica',
  'Maceración carbónica',
  'Láctica',
  'Alcohólica',
  'Otro',
] as const;

export const PERFILES_TAZA = [
  'Chocolate',
  'Caramelo',
  'Cítrico',
  'Frutos Rojos',
  'Frutas Tropicales',
  'Floral',
  'Especiado',
  'Vainilla',
  'Panela',
  'Otro',
] as const;

export const CERTIFICACIONES = [
  'Organic',
  'FairTrade',
  'Rainforest Alliance',
  '4C',
  'C.A.F.E. Practices',
  'Otro',
] as const;

export const MANEJO_AGUAS_MIELES = [
  { value: 'filtros', label: 'Filtros o Fosas', desc: 'Uso de filtros verdes, fosas de sedimentación o trampas de grasa.' },
  { value: 'biodigestor', label: 'Biodigestor', desc: 'Sistema que transforma los residuos en gas o abono líquido.' },
  { value: 'directo', label: 'Sin tratamiento', desc: 'Las aguas van directamente a la tierra o quebrada sin procesar.' },
  { value: 'Otro', label: 'Otro método', desc: 'Uso un sistema de limpieza diferente a los anteriores.' },
] as const;

export const FAUNA_BIODIVERSIDAD = [
  'Curillos',
  'Tangaras',
  'Barranqueros',
  'Azulejos',
  'Colibríes',
  'Gallinazos',
  'Gavilanes',
  'Carpinteros',
  'Ardillas',
  'Lagartos',
  'Micos',
  'Osos',
  'Guatines',
  'Armadillos',
  'Venados',
  'Guaguas',
  'Zarigüeyas (Chuchas)',
  'Felinos',
  'Zorros',
  'Yarumo',
  'Cipres',
  'Cedro',
  'Nogal',
  'Guayacán',
  'Helechos',
  'Orquídeas',
  'Otro',
] as const;

export const TIPOS_FUENTES_HIDRICAS = [
  'Nacimiento',
  'Quebrada',
  'Lago',
  'Rio',
  'Cascada',
  'Otro',
] as const;
