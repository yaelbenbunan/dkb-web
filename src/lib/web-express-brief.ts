/**
 * Cuestionario de requerimientos del producto de web cerrada.
 *
 * Es el eslabón que hace rentable el producto: todo lo que se recoja aquí es
 * material que no hay que perseguir después por WhatsApp, y el plazo de cinco
 * días no arranca hasta tenerlo completo. Por eso pregunta por bloques y no en
 * un asistente por pasos: quien lo rellena necesita ver de golpe todo lo que le
 * vamos a pedir para reunirlo de una sentada.
 *
 * Las preguntas base son iguales para los tres nichos; cada uno añade su propio
 * bloque con lo que solo aplica a su sector.
 */

export type BriefFieldType = "text" | "textarea" | "radio" | "checkbox";

export interface BriefField {
  name: string;
  label: string;
  type: BriefFieldType;
  required?: boolean;
  placeholder?: string;
  /** Aclaración bajo la etiqueta. Se usa para decir qué esperamos exactamente. */
  hint?: string;
  options?: readonly string[];
}

export interface BriefBlock {
  title: string;
  intro?: string;
  fields: BriefField[];
}

export interface WebExpressBrief {
  slug: "psicologos" | "fisioterapeutas" | "clinicas-esteticas";
  /** Debe coincidir con el `campaign` de la landing del mismo nicho. */
  campaign: string;
  metaTitle: string;
  title: string;
  intro: string;
  /** Bloque propio del sector, entre los servicios y la identidad visual. */
  nicheBlock: BriefBlock;
}

/** Iguales en los tres nichos. */
export const BASE_BLOCKS: BriefBlock[] = [
  {
    title: "Tus datos",
    intro: "Para localizar tu solicitud y contactarte si algo no cuadra.",
    fields: [
      { name: "name", label: "Nombre y apellidos", type: "text", required: true },
      { name: "email", label: "Email", type: "text", required: true, placeholder: "tu@correo.com" },
      { name: "phone", label: "Teléfono", type: "text", required: true, placeholder: "600 000 000" },
      {
        name: "businessName",
        label: "Nombre que quieres que aparezca en la web",
        type: "text",
        required: true,
        hint: "Tu nombre profesional o el del centro, tal cual quieres verlo.",
      },
    ],
  },
  {
    title: "Quién eres",
    fields: [
      {
        name: "presentation",
        label: "Preséntate en tres o cuatro frases",
        type: "textarea",
        required: true,
        hint: "Es el texto que abre la web. Escríbelo como se lo contarías a alguien que te pregunta a qué te dedicas.",
      },
      {
        name: "credentials",
        label: "Titulación y número de colegiado o registro",
        type: "text",
        hint: "Aparece en la web y da confianza. Si no procede, déjalo vacío.",
      },
      {
        name: "experience",
        label: "¿Cuántos años llevas ejerciendo?",
        type: "text",
        placeholder: "Ej: 8 años",
      },
    ],
  },
  {
    title: "Qué ofreces",
    fields: [
      {
        name: "services",
        label: "Servicios o tratamientos, uno por línea",
        type: "textarea",
        required: true,
        hint: "Con una frase de qué es cada uno. Salen tal cual, así que escríbelos como quieres leerlos.",
      },
      {
        name: "prices",
        label: "Tarifas",
        type: "textarea",
        hint: "Publicarlas ahorra consultas de gente que no va a contratar. Si prefieres no hacerlo, escribe «a consultar».",
      },
    ],
  },
];

/** Van después del bloque propio de cada nicho. */
export const CLOSING_BLOCKS: BriefBlock[] = [
  {
    title: "Dónde y cuándo",
    fields: [
      {
        name: "address",
        label: "Dirección",
        type: "text",
        hint: "Sale en el mapa. Si atiendes solo online, escribe «solo online».",
      },
      { name: "schedule", label: "Horarios de atención", type: "text", placeholder: "L-V 9:00-20:00" },
      {
        name: "publicContact",
        label: "Teléfono y email que quieres publicar",
        type: "text",
        hint: "Pueden ser distintos de los tuyos de contacto.",
      },
    ],
  },
  {
    title: "Cómo quieres que se vea",
    fields: [
      {
        name: "hasLogo",
        label: "¿Tienes logotipo?",
        type: "radio",
        required: true,
        options: ["Sí, lo adjunto por email", "No tengo"],
      },
      {
        name: "colors",
        label: "Colores de marca",
        type: "text",
        placeholder: "Ej: verde salvia y crema",
        hint: "Si no lo tienes claro, escribe «proponed vosotros».",
      },
      {
        name: "references",
        label: "Webs que te gusten",
        type: "textarea",
        hint: "De tu sector o de cualquier otro. Ver dos o tres ejemplos ahorra una ronda de cambios entera.",
      },
    ],
  },
  {
    title: "Para terminar",
    fields: [
      { name: "currentWebsite", label: "Web actual, si tienes", type: "text", placeholder: "www.tuweb.es" },
      { name: "social", label: "Redes sociales", type: "text", placeholder: "@tuperfil" },
      { name: "extra", label: "¿Algo más que debamos saber?", type: "textarea" },
    ],
  },
];

export const BRIEF_PSICOLOGOS: WebExpressBrief = {
  slug: "psicologos",
  campaign: "web-psicologos",
  metaTitle: "Cuestionario para tu web — Psicología | dinkbit",
  title: "Cuéntanos de tu consulta",
  intro:
    "Con esto tenemos todo lo que necesitamos. En cuanto lo recibamos completo empiezan a contar los cinco días.",
  nicheBlock: {
    title: "Sobre tu consulta",
    fields: [
      {
        name: "approach",
        label: "Enfoque o corriente con la que trabajas",
        type: "text",
        placeholder: "Ej: cognitivo-conductual, EMDR, sistémica",
      },
      {
        name: "audience",
        label: "¿A quién atiendes?",
        type: "checkbox",
        options: ["Adultos", "Adolescentes", "Infantil", "Parejas", "Familias", "Grupos"],
      },
      {
        name: "modality",
        label: "¿Cómo atiendes?",
        type: "radio",
        options: ["Presencial", "Online", "Presencial y online"],
      },
      {
        name: "specialties",
        label: "Motivos de consulta que trabajas más",
        type: "textarea",
        hint: "Ansiedad, duelo, trauma, alimentación… Es lo que busca la gente en Google, así que conviene nombrarlos.",
      },
    ],
  },
};

export const BRIEF_FISIOTERAPEUTAS: WebExpressBrief = {
  slug: "fisioterapeutas",
  campaign: "web-fisioterapeutas",
  metaTitle: "Cuestionario para tu web — Fisioterapia | dinkbit",
  title: "Cuéntanos de tu clínica",
  intro:
    "Con esto tenemos todo lo que necesitamos. En cuanto lo recibamos completo empiezan a contar los cinco días.",
  nicheBlock: {
    title: "Sobre tu clínica",
    fields: [
      {
        name: "techniques",
        label: "Técnicas que trabajas",
        type: "textarea",
        placeholder: "Punción seca, suelo pélvico, terapia manual, readaptación…",
        hint: "Es lo que te diferencia de la clínica de al lado, así que cuanto más concreto mejor.",
      },
      {
        name: "audience",
        label: "¿A quién atiendes?",
        type: "checkbox",
        options: ["Público general", "Deportistas", "Personas mayores", "Embarazo y posparto", "Infantil", "Laboral"],
      },
      {
        name: "homeVisits",
        label: "¿Atiendes a domicilio?",
        type: "radio",
        options: ["Sí", "No"],
      },
      {
        name: "insurance",
        label: "¿Trabajas con mutuas o seguros?",
        type: "text",
        hint: "Si es que sí, dinos cuáles: es de lo primero que pregunta la gente.",
      },
    ],
  },
};

export const BRIEF_CLINICAS_ESTETICAS: WebExpressBrief = {
  slug: "clinicas-esteticas",
  campaign: "web-clinicas-esteticas",
  metaTitle: "Cuestionario para tu web — Clínica estética | dinkbit",
  title: "Cuéntanos de tu clínica",
  intro:
    "Con esto tenemos todo lo que necesitamos. En cuanto lo recibamos completo empiezan a contar los cinco días.",
  nicheBlock: {
    title: "Sobre tu clínica",
    fields: [
      {
        name: "treatmentType",
        label: "¿Qué tipo de tratamientos hacéis?",
        type: "checkbox",
        options: [
          "Estética facial",
          "Estética corporal",
          "Aparatología",
          "Medicina estética",
          "Depilación",
          "Uñas y pestañas",
        ],
      },
      {
        name: "healthRegistry",
        label: "Número de registro sanitario del centro",
        type: "text",
        hint: "Obligatorio publicarlo si realizáis tratamientos médico-estéticos. Si no procede, déjalo vacío.",
      },
      {
        name: "team",
        label: "Equipo",
        type: "textarea",
        hint: "Nombre y puesto de cada profesional que queráis que aparezca. En estética el equipo vende tanto como el tratamiento.",
      },
      {
        name: "beforeAfter",
        label: "¿Queréis publicar fotos de antes y después?",
        type: "radio",
        options: ["Sí", "No", "No lo tenemos decidido"],
        hint: "La publicidad sanitaria está regulada: si la respuesta es sí, lo revisamos contigo antes de publicar.",
      },
    ],
  },
};

export const BRIEFS: WebExpressBrief[] = [
  BRIEF_PSICOLOGOS,
  BRIEF_FISIOTERAPEUTAS,
  BRIEF_CLINICAS_ESTETICAS,
];

export function briefBySlug(slug: string): WebExpressBrief | undefined {
  return BRIEFS.find((b) => b.slug === slug);
}

/** Bloques completos y en orden, listos para pintar. */
export function briefBlocks(brief: WebExpressBrief): BriefBlock[] {
  return [...BASE_BLOCKS, brief.nicheBlock, ...CLOSING_BLOCKS];
}
