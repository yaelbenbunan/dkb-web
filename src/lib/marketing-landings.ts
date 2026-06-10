/**
 * Configuración de las landings de captación (tráfico de pago).
 *
 * Cada landing vende una misma oferta integral: desarrollo web enfocado a
 * conversión + gestión de campañas (Google, Meta, lo que haga falta) para
 * traer contactos reales. No hacemos webs "por hacer": cada web y cada
 * campaña existen para conseguir clientes/pacientes.
 *
 * El componente <MarketingLanding> renderiza todas las secciones a partir de
 * uno de estos objetos. Los slugs de `cases` deben resolver a casos reales en
 * src/content/casos-de-exito (verificado en los tests).
 */

/** Pregunta de presupuesto, común a todas las landings. */
export const BUDGET_LABEL = "¿Qué presupuesto tienes para marketing?";
export const BUDGET_OPTIONS = [
  "Menos de 500€",
  "Entre 500€ y 1.000€",
  "Más de 1.000€",
];

export interface MarketingSubservice {
  /** Título corto del subservicio. */
  title: string;
  /** Descripción orientada al beneficio para este público. */
  description: string;
  /** Lista de "incluye" — entregables concretos. */
  includes: string[];
}

export interface MarketingCase {
  /** Slug del caso en src/content/casos-de-exito. */
  slug: string;
  /** Descripción del negocio (qué es), no de los servicios que le hicimos. */
  description: string;
}

export interface MarketingFaq {
  q: string;
  a: string;
}

export interface MarketingLanding {
  /** Identificador interno + valor de `landing` en el tracking. */
  key: "clinicas" | "negocios";
  /** Ruta pública (sin dominio). */
  path: string;
  /** Texto de origen que viaja en el email del lead. */
  origin: string;

  metaTitle: string;
  metaDescription: string;

  /** Imagen de fondo del hero (opcional). PNG con transparencia recomendado;
   *  se renderiza con baja opacidad detrás del contenido. */
  heroImage?: string;

  eyebrow: string;
  /** Parte del titular resaltada en azul (va primero). */
  headlineAccent: string;
  /** Resto del titular, en color normal. */
  headlineRest: string;
  /** Subtítulo en tres partes para poder resaltar la frase central. */
  subhead: { pre: string; highlight: string; post: string };
  heroBullets: string[];

  /** CTA principal del formulario. */
  formTitle: string;
  formSubtitle: string;
  /** Etiqueta y opciones del selector "tipo de clínica/negocio". */
  typeLabel: string;
  typePlaceholder: string;
  typeOptions: string[];

  subservicesTitle: string;
  subservicesIntro: string;
  subservices: MarketingSubservice[];

  casesTitle: string;
  casesIntro: string;
  cases: MarketingCase[];

  faqsTitle: string;
  faqs: MarketingFaq[];

  finalCtaTitle: string;
  finalCtaSubtitle: string;
}

export const MARKETING_CLINICAS: MarketingLanding = {
  key: "clinicas",
  path: "/marketing-clinicas",
  origin: "Landing Clínicas (Salud)",

  metaTitle: "Marketing para clínicas — más pacientes cada mes | dinkbit",
  metaDescription:
    "Web enfocada a conversión + campañas en Google y Meta para llenar la agenda de tu clínica con pacientes reales. Casos: Benbunan, Adeslas, Urolf.",

  eyebrow: "Marketing para clínicas y centros de salud",
  headlineAccent: "Más pacientes",
  headlineRest: "para tu clínica, cada mes",
  subhead: {
    pre: "No hacemos webs por hacer. Diseñamos una web pensada para ",
    highlight: "convertir visitas en citas",
    post: " y gestionamos tus campañas en Google y redes para que lleguen pacientes reales, no solo clics.",
  },
  heroBullets: [
    "Web médica orientada a la reserva de cita",
    "Campañas en Google y Meta gestionadas por nosotros",
    "Pacientes cualificados de tu zona, listos para llamar",
  ],

  formTitle: "Pide tu diagnóstico gratuito",
  formSubtitle:
    "Déjanos tus datos y te llamamos en menos de 24h para contarte cómo conseguir más pacientes.",
  typeLabel: "Tipo de clínica",
  typePlaceholder: "Selecciona tu especialidad",
  typeOptions: [
    "Dental",
    "Estética / Medicina estética",
    "Fisioterapia",
    "Urología",
    "Ginecología",
    "Oftalmología",
    "Psicología",
    "Veterinaria",
    "Otra especialidad",
  ],

  subservicesTitle: "Una solución integral para conseguir pacientes",
  subservicesIntro: "Web y campañas trabajando juntas para llenar tu agenda.",
  subservices: [
    {
      title: "Web para clínicas enfocada a conversión",
      description:
        "Una web rápida, clara y profesional que transmite confianza desde el primer segundo y guía al paciente hacia la reserva de cita.",
      includes: [
        "Diseño orientado a la cita (llamada, formulario, WhatsApp)",
        "Optimizada para móvil y para aparecer en Google",
        "Textos que resuelven las dudas del paciente",
        "Carga rápida y mediciones listas para campañas",
      ],
    },
    {
      title: "Campañas en Google y Meta para captar pacientes",
      description:
        "Gestionamos la publicidad en Google Ads y redes sociales para que tu clínica aparezca justo cuando alguien de tu zona busca tu especialidad.",
      includes: [
        "Google Ads para búsquedas con intención de cita",
        "Campañas en Instagram y Facebook (Meta)",
        "Segmentación por zona y especialidad",
        "Optimización continua por coste por paciente",
      ],
    },
  ],

  casesTitle: "Clínicas que ya confían en nosotros",
  casesIntro:
    "Hemos construido la presencia digital de clínicas desde cero y la hemos convertido en su principal canal de pacientes.",
  cases: [
    {
      slug: "benbunan-clinica-dental",
      description:
        "Clínica dental de referencia en Albacete, con más de 40 años de experiencia.",
    },
    {
      slug: "adeslas",
      description:
        "Agente exclusivo de Adeslas, uno de los líderes en seguros de salud en España.",
    },
    {
      slug: "urolf",
      description:
        "Clínica especializada en urología, con un enfoque integral y personalizado.",
    },
  ],

  faqsTitle: "Preguntas frecuentes",
  faqs: [
    {
      q: "¿Tengo que cambiar mi web actual?",
      a: "No siempre. Revisamos tu web y, si está bien orientada a conversión, trabajamos sobre ella. Si frena las citas, te proponemos mejorarla o rehacerla — siempre enfocada a resultados, no por hacer.",
    },
    {
      q: "¿Vosotros gestionáis las campañas o solo la web?",
      a: "Nos encargamos de todo: la web y la gestión completa de las campañas en Google, Meta o el canal que mejor funcione para tu especialidad.",
    },
    {
      q: "¿En cuánto tiempo veré resultados?",
      a: "Las campañas empiezan a traer contactos desde las primeras semanas. La parte de posicionamiento orgánico es progresiva, y la vamos construyendo en paralelo.",
    },
    {
      q: "¿Trabajáis con mi especialidad?",
      a: "Sí. Hemos trabajado con clínicas dentales, urología, estética y más. Adaptamos el mensaje y la segmentación a cada especialidad.",
    },
  ],

  finalCtaTitle: "¿Listo para llenar tu agenda de pacientes?",
  finalCtaSubtitle:
    "Cuéntanos qué clínica tienes y te preparamos un plan para conseguir más pacientes cada mes.",
};

export const MARKETING_NEGOCIOS: MarketingLanding = {
  key: "negocios",
  path: "/marketing-negocios-locales",
  origin: "Landing Negocios locales",

  metaTitle: "Marketing para negocios locales — más clientes | dinkbit",
  metaDescription:
    "Web profesional enfocada a conversión + campañas locales en Google y Meta para traer clientes a tu negocio. Casos: SodaCrowd, Ucan, Kbye.",

  eyebrow: "Marketing para negocios locales",
  headlineAccent: "Más clientes",
  headlineRest: "para tu negocio local",
  subhead: {
    pre: "No hacemos webs por hacer. Diseñamos una web profesional pensada para ",
    highlight: "convertir visitas en clientes",
    post: " y gestionamos tus campañas en Google y redes para que lleguen clientes de verdad, no solo visitas.",
  },
  heroBullets: [
    "Web profesional orientada a la venta y al contacto",
    "Campañas locales en Google y Meta gestionadas por nosotros",
    "Clientes de tu zona, listos para comprar o reservar",
  ],

  formTitle: "Pide tu propuesta gratuita",
  formSubtitle:
    "Déjanos tus datos y te llamamos en menos de 24h para contarte cómo conseguir más clientes.",
  typeLabel: "Tipo de negocio",
  typePlaceholder: "Selecciona tu sector",
  typeOptions: [
    "Tienda / Retail",
    "Restaurante / Hostelería",
    "Servicios profesionales",
    "Belleza / Peluquería",
    "Reformas / Hogar",
    "Inmobiliaria",
    "Ecommerce",
    "Otro sector",
  ],

  subservicesTitle: "Una solución integral para conseguir clientes",
  subservicesIntro:
    "Web y campañas trabajando juntas para hacer crecer tu negocio.",
  subservices: [
    {
      title: "Web profesional enfocada a conversión",
      description:
        "Una web rápida y profesional que transmite confianza y guía al cliente hacia la compra, la reserva o el contacto.",
      includes: [
        "Diseño orientado a la venta y al contacto",
        "Optimizada para móvil y para aparecer en Google",
        "Textos que convencen y resuelven dudas",
        "Carga rápida y mediciones listas para campañas",
      ],
    },
    {
      title: "Campañas locales en Google y Meta",
      description:
        "Gestionamos la publicidad para que tu negocio aparezca cuando alguien de tu zona busca lo que ofreces.",
      includes: [
        "Google Ads y Google Maps para búsquedas locales",
        "Campañas en Instagram y Facebook (Meta)",
        "Segmentación por zona y público ideal",
        "Optimización continua por coste por cliente",
      ],
    },
  ],

  casesTitle: "Negocios que ya confían en nosotros",
  casesIntro:
    "Hemos lanzado y escalado la captación de clientes de negocios y marcas desde cero, optimizando cada euro invertido.",
  cases: [
    {
      slug: "sodacrowd",
      description:
        "Plataforma de inversión inmobiliaria que conecta inversores con oportunidades reales.",
    },
    {
      slug: "ucan",
      description:
        "Marca de material deportivo para yoga, pilates y barre, con tienda online propia.",
    },
    {
      slug: "kbye",
      description:
        "Tienda de moda de Barcelona con una comunidad fiel y mucha personalidad.",
    },
  ],

  faqsTitle: "Preguntas frecuentes",
  faqs: [
    {
      q: "¿Tengo que cambiar mi web actual?",
      a: "No siempre. Revisamos tu web y, si vende bien, trabajamos sobre ella. Si frena las ventas, te proponemos mejorarla o rehacerla — siempre enfocada a resultados, no por hacer.",
    },
    {
      q: "¿Vosotros gestionáis las campañas o solo la web?",
      a: "Nos encargamos de todo: la web y la gestión completa de las campañas en Google, Meta o el canal que mejor funcione para tu negocio.",
    },
    {
      q: "¿Sirve aunque mi negocio sea pequeño y local?",
      a: "Sí. Trabajamos la segmentación por zona para que tu inversión vaya a clientes de tu área que realmente pueden comprarte.",
    },
    {
      q: "¿En cuánto tiempo veré resultados?",
      a: "Las campañas empiezan a traer contactos desde las primeras semanas. El posicionamiento orgánico es progresivo y lo construimos en paralelo.",
    },
  ],

  finalCtaTitle: "¿Listo para conseguir más clientes?",
  finalCtaSubtitle:
    "Cuéntanos qué negocio tienes y te preparamos un plan para que entren más clientes cada mes.",
};

export const MARKETING_LANDINGS: MarketingLanding[] = [
  MARKETING_CLINICAS,
  MARKETING_NEGOCIOS,
];
