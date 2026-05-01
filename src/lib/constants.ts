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

export const HABEAS_DATA_TEXT = {
  title: 'Política de tratamiento de datos personales (Habeas Data)',
  intro: 'En cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas concordantes, yo, en calidad de titular de la información, autorizo de manera LIBRE, PREVIA, EXPRESA e INFORMADA a CaféProy (en adelante “El Responsable”) para que realice la recolección, almacenamiento, uso, circulación, supresión y tratamiento de mis datos personales y de mi unidad productiva.',
  secciones: [
    {
      titulo: '1. Finalidades del tratamiento',
      items: [
        'Caracterización técnica, social y productiva del caficultor y su finca.',
        'Geolocalización (GPS) para la trazabilidad de origen y verificación de sostenibilidad.',
        'Recolección de material fotográfico y multimedia para la promoción comercial y marketing en vitrinas nacionales e internacionales.',
        'Contacto directo para el envío de información técnica, comercial y de proyectos de impacto social.',
        'Compartir información (incluyendo ubicación) con aliados comerciales y compradores de especialidad para facilitar el comercio directo.'
      ]
    },
    {
      titulo: '2. Tratamiento de datos sensibles',
      texto: 'Manifiesto que he sido informado de que no estoy obligado a autorizar el tratamiento de datos sensibles (ubicación exacta o imágenes), sin embargo, autorizo su uso reconociendo que son esenciales para la certificación de origen y el valor comercial de mi café.'
    },
    {
      titulo: '3. Derechos del titular',
      items: [
        'Conocer, actualizar y rectificar mis datos personales ante El Responsable.',
        'Solicitar prueba de la autorización otorgada.',
        'Ser informado sobre el uso que se le ha dado a mis datos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).',
        'Revocar la autorización o solicitar la supresión del dato cuando no se respeten los principios constitucionales.'
      ]
    },
    {
      titulo: '4. Seguridad y almacenamiento',
      texto: 'El Responsable garantiza que la información se almacena bajo estrictos protocolos de seguridad técnica, incluyendo cifrado de datos y protección contra accesos no autorizados, cumpliendo con los estándares mínimos exigidos por la SIC.'
    },
    {
      titulo: '5. Canales de atención',
      texto: 'Para ejercer mis derechos, podré contactarme a través del correo electrónico: burbano.hub@gmailcom o mediante los canales oficiales de soporte de la plataforma.'
    }
  ],
  autorizacion: 'Al marcar la casilla de aceptación, confirmo que soy el titular de la información o estoy plenamente facultado para entregarla, y que autorizo el tratamiento bajo los términos aquí descritos.'
};
