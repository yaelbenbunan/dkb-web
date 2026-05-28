export interface PromptInput {
  businessName: string;
  sectorLabel: string;
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: "productos" | "servicios";
  offerings: string[];
  valueProp: string;
  paletteSlug: string;
  paletteAccent: string;
  template: "informativa" | "ecommerce";
}

interface SectorPromptHints {
  /** "clínicas y centros del sector salud (médico, dental, …)" */
  expertContext: string;
  /** "paciente", "alumno", "cliente" */
  audienceNoun: string;
  /** "tratamiento", "programa", "servicio" */
  offeringNoun: string;
  /** "Pide tu cita", "Reserva tu plaza", "Solicita presupuesto" */
  ctaExamples: string;
  /** Role examples for team[].role */
  teamRoleExamples: string;
}

const SECTOR_PROMPT_HINTS: Record<string, SectorPromptHints> = {
  salud: {
    expertContext:
      "clínicas y centros del sector salud (médico, dental, estética, fisioterapia, óptica, veterinaria, etc.)",
    audienceNoun: "paciente",
    offeringNoun: "tratamiento",
    ctaExamples: "'Pide tu cita', 'Reserva consulta', 'Solicita información'",
    teamRoleExamples:
      "'Odontóloga', 'Higienista dental', 'Médico especialista', 'Recepción'",
  },
  educacion: {
    expertContext:
      "centros educativos (colegios, academias, escuelas de idiomas, formación profesional, universidades, ed. infantil, etc.)",
    audienceNoun: "alumno o familia",
    offeringNoun: "programa o curso",
    ctaExamples:
      "'Reserva tu plaza', 'Solicita información', 'Agenda una visita'",
    teamRoleExamples:
      "'Director pedagógico', 'Profesor de Matemáticas', 'Coordinador de inglés', 'Orientadora'",
  },
  moda: {
    expertContext:
      "marcas de moda, atelier, tiendas de ropa, diseño de autor, accesorios o complementos",
    audienceNoun: "cliente",
    offeringNoun: "colección, servicio o producto",
    ctaExamples:
      "'Descúbrelo', 'Visita el showroom', 'Reserva tu cita', 'Compra ahora'",
    teamRoleExamples:
      "'Diseñador/a', 'Pattern maker', 'Atención al cliente', 'Personal shopper'",
  },
  tecnologia: {
    expertContext:
      "empresas tecnológicas (software, agencias digitales, ciberseguridad, IT, SaaS, etc.)",
    audienceNoun: "cliente",
    offeringNoun: "servicio o solución",
    ctaExamples: "'Hablemos', 'Solicita una demo', 'Cuéntanos tu proyecto'",
    teamRoleExamples:
      "'Lead Developer', 'Product Designer', 'CTO', 'Cliente Success', 'Cybersecurity Specialist'",
  },
  servicios: {
    expertContext:
      "empresas de servicios profesionales (consultoría, asesoría, despachos legales, contabilidad, RRHH, etc.)",
    audienceNoun: "cliente",
    offeringNoun: "servicio",
    ctaExamples:
      "'Solicita presupuesto', 'Contacta con nosotros', 'Agenda una llamada'",
    teamRoleExamples:
      "'Socia directora', 'Abogado mercantil', 'Consultor senior', 'Asesor fiscal'",
  },
};

const DEFAULT_HINTS: SectorPromptHints = SECTOR_PROMPT_HINTS.servicios;

function getSectorHints(sectorLabel: string): SectorPromptHints {
  const slug = sectorLabel.toLowerCase();
  // Match either by Spanish label or a normalized slug
  if (slug.includes("salud")) return SECTOR_PROMPT_HINTS.salud;
  if (slug.includes("educac")) return SECTOR_PROMPT_HINTS.educacion;
  if (slug.includes("moda")) return SECTOR_PROMPT_HINTS.moda;
  if (slug.includes("tecnolog")) return SECTOR_PROMPT_HINTS.tecnologia;
  if (slug.includes("servicio")) return SECTOR_PROMPT_HINTS.servicios;
  return DEFAULT_HINTS;
}

export function buildSectorInformativaCopyPrompt(input: PromptInput): string {
  const hints = getSectorHints(input.sectorLabel);
  return [
    `Eres copywriter web especializado en ${hints.expertContext}.`,
    "El usuario rellenó un cuestionario para generar el preview de su web.",
    "Genera copy en español de España, profesional, cercano y confiable.",
    "",
    `Negocio: ${input.businessName}`,
    `Sector: ${input.sectorLabel}`,
    `Tipo: Web informativa`,
    `Servicios/${hints.offeringNoun}s: ${input.offerings.join(", ")}`,
    `Valor agregado escrito por el usuario: "${input.valueProp}"`,
    "",
    "Reglas:",
    "- NO inventes números (años de experiencia, clientes atendidos, premios,",
    "  certificaciones, porcentajes de éxito).",
    "- NO uses marketing-speak ('líderes', 'pioneros', 'mejor del mercado').",
    "- Tono: profesional, calmado, humano. No clickbait.",
    "- Español de España.",
    "- heroHeadline: una frase corta orientada a confianza y propuesta de valor.",
    `- heroTagline: explica qué hace el negocio y por qué elegirlo, sin métricas inventadas.`,
    `- ctaText: invitación a contactar/contratar (Ej. ${hints.ctaExamples}).`,
    `- sectionTitle: titular para la lista de ${hints.offeringNoun}s.`,
    `- offerings[].blurb: una frase concreta y honesta sobre cada ${hints.offeringNoun}.`,
    "",
    "- valorAgregadoTitle: titular corto para la sección de valor agregado",
    "  (ej. 'Por qué elegirnos', 'Cuidamos cada detalle').",
    `- valorAgregadoIntro: 1-2 frases que conecten con el ${hints.audienceNoun}.`,
    `- bullets: EXACTAMENTE 4 O 6 ventajas (nunca 5). Elige 4 si el negocio es`,
    "  sencillo, 6 si tiene más matices. Cada bullet: title (2-5 palabras),",
    "  text (1 frase concreta, sin números inventados).",
    "",
    "- team: EXACTAMENTE entre 4 y 6 miembros INVENTADOS. Nombres y apellidos",
    `  españoles realistas. Puesto coherente con el sector (ej. ${hints.teamRoleExamples}).`,
    "  Cada miembro debe incluir gender: 'male' o 'female' coherente con el nombre",
    "  (María/Lucía/Marta = female; Pablo/Javier/Marco = male). Si el nombre es",
    "  ambiguo (Andrea, Alex…), elige el género más probable.",
    "",
    "- testimonials: EXACTAMENTE entre 3 y 4 testimonios INVENTADOS pero realistas.",
    "  Cada uno: name (nombre + inicial de apellido, Ej. 'María G.') y text",
    `  (40-280 caracteres). AL MENOS UNO debe mencionar el nombre "${input.businessName}".`,
    `  Tono natural de ${hints.audienceNoun}: detalle concreto, sin superlativos vacíos.`,
    "",
    "RESPONDE ÚNICAMENTE con un objeto JSON válido (sin markdown ni texto extra)",
    "con esta forma exacta:",
    "{",
    '  "heroHeadline": string (8-80),',
    '  "heroTagline": string (20-220),',
    '  "ctaText": string (1-40),',
    '  "sectionTitle": string (2-60),',
    '  "offerings": [{ "name": string, "blurb": string (20-160) }, ...],',
    '  "valorAgregadoTitle": string (2-80),',
    '  "valorAgregadoIntro": string (20-240),',
    '  "bullets": [{ "title": string (2-60), "text": string (20-180) }, ... 4 or 6 items],',
    '  "team": [{ "name": string, "role": string, "gender": "male" | "female" }, ... 4-6 items],',
    '  "testimonials": [{ "name": string, "text": string (40-280) }, ... 3-4 items]',
    "}",
    `Debes devolver EXACTAMENTE ${input.offerings.length} entradas en "offerings",`,
    "una por cada servicio listado arriba, en el mismo orden.",
  ].join("\n");
}

/** @deprecated use {@link buildSectorInformativaCopyPrompt} */
export const buildSaludCopyPrompt = buildSectorInformativaCopyPrompt;

export function buildCopyPrompt(input: PromptInput): string {
  const tipo =
    input.businessType === "ecommerce"
      ? `Ecommerce — ${input.ecommerceKind ?? "productos"}`
      : "Web informativa";

  return [
    "Eres copywriter web especializado en convertir visitas en clientes.",
    "El usuario rellenó un cuestionario para generar un preview de su web.",
    "Genera copy NATURAL Y CONFIABLE en español de España para su home.",
    "",
    `Negocio: ${input.businessName}`,
    `Sector: ${input.sectorLabel}`,
    `Tipo: ${tipo}`,
    `Oferta: ${input.offerings.join(", ")}`,
    `Valor agregado escrito por el usuario: "${input.valueProp}"`,
    "",
    "Reglas:",
    "- NO inventes datos numéricos, años de experiencia, certificaciones,",
    "  premios ni clientes específicos.",
    "- Usa el valor agregado del usuario como insumo, pero reescríbelo mejor.",
    "- Tono profesional cercano, sin marketing-speak vacío",
    "  (prohibido: 'revolucionario', 'líder', 'mejor del mercado', 'pasión').",
    "- Español de España: 'ordenador' no 'computadora', 'móvil' no 'celular'.",
    "- heroHeadline: gancho corto que enganche, no descripción larga.",
    "- heroTagline: una frase que explique qué hace el negocio y por qué",
    "  elegirlo.",
    "- offerings[].blurb: una frase concreta sobre ese producto/servicio,",
    "  no genericidades.",
    "",
    "RESPONDE ÚNICAMENTE con un objeto JSON válido (sin markdown ni texto extra)",
    "con esta forma exacta:",
    "{",
    '  "heroHeadline": string (8-80 chars),',
    '  "heroTagline": string (20-220 chars),',
    '  "ctaText": string (1-40 chars),',
    '  "sectionTitle": string (2-60 chars),',
    '  "offerings": [{ "name": string, "blurb": string (20-160 chars) }, ...]',
    "}",
    `Debes devolver EXACTAMENTE ${input.offerings.length} entradas en "offerings",`,
    "una por cada producto/servicio listado arriba, en el mismo orden.",
  ].join("\n");
}

export function buildImagePrompt(input: PromptInput): string {
  const orientation =
    input.template === "informativa"
      ? "Portrait orientation, subject centered in frame."
      : "Landscape 16:9 orientation, subject slightly right-of-center to allow text overlay on the left.";

  const composition =
    input.template === "informativa"
      ? "Editorial magazine still life, calm composition."
      : "Wide cinematic banner, environmental shot.";

  const sectorHint = sectorSubjectHint(input.sectorLabel);
  const accentHex = input.paletteAccent.replace("#", "").toLowerCase();

  return [
    `Professional hero image for a ${input.sectorLabel} business website.`,
    "Style: clean modern editorial photography, soft natural lighting,",
    `color palette aligned with accent hex ${accentHex}.`,
    composition,
    `Subject: ${sectorHint}.`,
    orientation,
    "Constraints: NO people faces visible, NO text in image, NO logos,",
    "NO watermarks, NO UI elements, NO charts or graphs.",
  ].join(" ");
}

function sectorSubjectHint(label: string): string {
  const map: Record<string, string> = {
    Salud:
      "soft minimal clinic interior or natural wellness objects, abstract not literal",
    Educación: "open notebook, light coming from window, no faces, no text",
    Restauración:
      "warm restaurant tabletop with natural ingredients, soft styling",
    Moda: "clean fabric textures or fashion still life, no models",
    Tecnología:
      "abstract geometric shapes, soft gradient, modern tech aesthetic, no devices with screens",
    "Servicios profesionales":
      "minimal modern office setting, plants, neutral palette, no people",
    Otro: "abstract minimal scene with organic shapes",
  };
  return map[label] ?? map["Otro"];
}
