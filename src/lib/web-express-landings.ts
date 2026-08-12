/**
 * Landings de captación para el producto de web cerrada por nicho.
 *
 * Distinto de marketing-landings.ts: aquellas venden marketing recurrente y
 * preguntan presupuesto; estas venden un producto de precio cerrado, así que el
 * formulario no pregunta cuánto puede gastar (a este precio no discrimina a
 * nadie) sino lo que sí cambia la conversación: quién decide, para cuándo, y si
 * parte de cero o hay web que rehacer.
 *
 * Todo el copy vive aquí para que añadir el siguiente nicho —fisioterapeutas,
 * clínicas estéticas— sea escribir un objeto, no una página.
 */

export const WEB_EXPRESS_PRICE = "459€";
export const WEB_EXPRESS_DAYS = 5;

/** Opciones compartidas del formulario: iguales en todos los nichos. */
export const CONTACT_METHODS = ["WhatsApp", "Llamada telefónica", "Email"] as const;

export const TIME_SLOTS = [
  "Mañanas (9:00 – 14:00)",
  "Mediodía (14:00 – 16:00)",
  "Tardes (a partir de las 16:00)",
  "Indiferente",
] as const;

/**
 * Filtro de calidad. La segunda opción evita el "no, busco información para mi
 * empresa" del B2B clásico, que no le encaja a quien tiene consulta propia.
 */
export const DECISION_MAKER = [
  "Sí, decido yo",
  "Trabajo en el centro, pero decide otra persona",
] as const;

export const URGENCY = [
  "Lo antes posible (1-2 semanas)",
  "En el próximo mes",
  "Solo estoy comparando precios",
] as const;

export const GOALS = [
  "Tener una imagen profesional",
  "Captar más pacientes",
  "Aparecer en Google (SEO)",
] as const;

/** Sustituye a la pregunta por facturación: mismo valor comercial, sin meterse
 *  en el bolsillo de nadie en un primer contacto. */
export const PRACTICE_STAGE = [
  "Estoy empezando",
  "Ya tengo consulta en marcha",
] as const;

export interface WebExpressLanding {
  key: "psicologos";
  path: string;
  /** Se persiste en el CRM para saber de qué landing vino el lead. */
  origin: string;
  campaign: string;

  metaTitle: string;
  metaDescription: string;

  headline: string;
  headlineAccent: string;
  subhead: string;
  /** Los tres datos clave. Van aquí y NO repetidos en una franja aparte. */
  heroBullets: string[];

  /**
   * Los dolores del nicho, en sus palabras, con la respuesta debajo. Enunciar
   * el problema hace que se identifique; contestarlo en la misma tarjeta es lo
   * que convierte el reconocimiento en motivo para rellenar el formulario.
   */
  painTitle: string;
  painIntro: string;
  pains: { problem: string; answer: string }[];

  includesTitle: string;
  includes: string[];
  excludesTitle: string;
  excludes: string[];

  stepsTitle: string;
  steps: { title: string; description: string }[];

  faqsTitle: string;
  faqs: { q: string; a: string }[];

  /** Imagen de fondo del hero. Mientras no exista, ImageSlot reserva el hueco. */
  heroImage: { src: string; alt: string; ready: boolean };

  formTitle: string;
  formSubtitle: string;

  /** Etiqueta del campo de objetivo, adaptada al nicho. */
  goalsLabel: string;
  stageLabel: string;
}

export const WEB_PSICOLOGOS: WebExpressLanding = {
  key: "psicologos",
  path: "/web-para-psicologos",
  origin: "Landing Web para psicólogos",
  campaign: "web-psicologos",

  metaTitle: `Web para psicólogos en una semana por ${WEB_EXPRESS_PRICE} | dinkbit`,
  metaDescription: `Diseñamos la web de tu consulta de psicología en ${WEB_EXPRESS_DAYS} días laborables por ${WEB_EXPRESS_PRICE}. Preparada para móvil, con formulario de contacto y lista para recibir pacientes.`,

  headline: "La web de tu consulta,",
  headlineAccent: `lista en una semana por ${WEB_EXPRESS_PRICE}`,
  subhead:
    "Sin plantillas genéricas ni cuotas mensuales. La diseñamos a tu medida y en cinco días laborables la tienes funcionando.",
  heroBullets: [
    `Entrega en ${WEB_EXPRESS_DAYS} días laborables`,
    "Precio cerrado, sin cuotas",
    "Adaptada a formato móvil",
  ],

  painTitle: "Si te suena alguna, esto es para ti",
  painIntro: "Lo que nos cuentan la mayoría de consultas antes de empezar.",
  pains: [
    {
      problem:
        "«Me encuentran por Instagram o por el boca a boca, pero no tengo dónde mandarles»",
      answer:
        "Una web a la que enlazar desde tu perfil, con todo lo que necesitan saber antes de escribirte.",
    },
    {
      problem:
        "«Pago por aparecer en un directorio, pero mi ficha es igual que la de otros doscientos»",
      answer:
        "Tu propio espacio, con tu nombre y tu forma de trabajar. Sin competir en una lista.",
    },
    {
      problem: "«Pedí presupuesto y me hablaron de 2.000€ y dos meses»",
      answer: "459€ y cinco días laborables. Precio cerrado antes de empezar.",
    },
    {
      problem: "«Quiero transmitir confianza antes de la primera sesión»",
      answer:
        "Una web sobria y clara, pensada para que quien llega dudando dé el paso.",
    },
  ],

  includesTitle: "Qué incluye",
  includes: [
    "Una página con hasta 6 secciones: quién eres, en qué ayudas, cómo trabajas, tarifas, dónde estás y contacto.",
    "Diseño hecho a partir de tus respuestas, no una plantilla rellenada.",
    "Se ve bien en móvil, tablet y ordenador.",
    "Formulario de contacto que te llega a tu correo.",
    "Botón de WhatsApp y de llamada, para que puedan escribirte en un toque.",
    "Aviso legal, política de privacidad y cookies.",
    "Una ronda de cambios incluida.",
  ],
  excludesTitle: "Qué no incluye",
  excludes: [
    "Agenda o reserva de cita online (te lo presupuestamos aparte si lo necesitas).",
    "Área privada de pacientes o historia clínica.",
    "Blog o publicación de artículos.",
    "Redacción de textos y sesión de fotos: los aportas tú.",
    "Diseño de logotipo.",
    "Dominio y alojamiento (te asesoramos y son unos 100€/año).",
  ],

  stepsTitle: "Cómo funciona",
  steps: [
    {
      title: "Nos dejas tus datos",
      description:
        "Rellenas el formulario de abajo. Te contactamos por donde nos digas y en la franja que te venga bien.",
    },
    {
      title: "Hablamos 15 minutos",
      description:
        "Te contamos qué necesitamos de ti y resolvemos dudas. Sin compromiso y sin venta agresiva.",
    },
    {
      title: "Rellenas el cuestionario",
      description:
        "Un formulario guiado donde recogemos tus textos, tus colores y los detalles de tu consulta. Es lo único que necesitamos.",
    },
    {
      title: "En 5 días la tienes",
      description:
        `El plazo empieza cuando recibimos todo el material. Revisas, pides cambios una vez y publicamos.`,
    },
  ],

  faqsTitle: "Preguntas frecuentes",
  faqs: [
    {
      q: `¿${WEB_EXPRESS_PRICE} es el precio final?`,
      a: "Sí, IVA no incluido. No hay cuotas mensuales ni cargos ocultos. Lo único aparte son el dominio y el alojamiento, que se contratan a tu nombre y rondan los 100€ al año.",
    },
    {
      q: "¿Por qué tan barato si otros piden 2.000€?",
      a: "Porque el alcance está cerrado de antemano: una página, seis secciones y una ronda de cambios. No es una web a medida sin límites, es un producto definido. Por eso podemos hacerla en una semana y a este precio.",
    },
    {
      q: "¿Y si necesito agenda para que reserven cita?",
      a: "No entra en los 459€, pero lo hacemos. Nos lo comentas en la llamada y te pasamos presupuesto aparte.",
    },
    {
      q: "¿Los 5 días desde cuándo cuentan?",
      a: "Desde que tenemos todo tu material: textos, fotos y el cuestionario relleno. Es lo justo para los dos, porque la parte que depende de nosotros sí la controlamos.",
    },
    {
      q: "No tengo textos ni fotos, ¿qué hago?",
      a: "Te damos una guía con lo que necesita cada sección para que no partas de cero. Si prefieres que los escribamos nosotros, es un extra y te lo presupuestamos.",
    },
    {
      q: "¿La web cumple con la protección de datos?",
      a: "Llevas aviso legal, política de privacidad y de cookies, y el formulario recoge el consentimiento como marca la normativa. Si tratas datos de salud, en la llamada te contamos qué implica en tu caso.",
    },
  ],

  heroImage: {
    src: "/img/landings/header-psicologos.jpg",
    alt: "Consulta de psicología con dos butacas y luz natural",
    ready: false,
  },

  formTitle: "Cuéntanos de tu consulta",
  formSubtitle: "Te contactamos en menos de 24 horas.",

  goalsLabel: "¿Para qué quieres la web?",
  stageLabel: "¿En qué punto estás?",
};

/**
 * Etiqueta corta para las pastillas del formulario.
 *
 * Se muestra la versión breve —así cada grupo entra en una sola fila y se lee
 * de un vistazo— pero lo que viaja al CRM sigue siendo el valor completo, que
 * es lo que necesita quien luego coge el teléfono. Sin esto había que elegir
 * entre un formulario legible y unas notas útiles.
 */
export const SHORT_LABELS: Record<string, string> = {
  "Llamada telefónica": "Llamada",
  "Mañanas (9:00 – 14:00)": "Mañanas",
  "Mediodía (14:00 – 16:00)": "Mediodía",
  "Tardes (a partir de las 16:00)": "Tardes",
  "Trabajo en el centro, pero decide otra persona": "Decide otra persona",
  "Lo antes posible (1-2 semanas)": "1-2 semanas",
  "En el próximo mes": "Este mes",
  "Solo estoy comparando precios": "Solo comparo",
  "Tener una imagen profesional": "Imagen profesional",
  "Captar más pacientes": "Captar pacientes",
  "Aparecer en Google (SEO)": "Salir en Google",
  "Estoy empezando": "Empezando",
  "Ya tengo consulta en marcha": "En marcha",
};

export const shortLabel = (v: string): string => SHORT_LABELS[v] ?? v;
