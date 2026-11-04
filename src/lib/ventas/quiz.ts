/**
 * Chequeo de salud digital: el quiz de captación de Dinkbit por WhatsApp.
 * Módulo puro (sin `server-only`): lo usan el motor de secuencias (también en
 * el simulador del editor) y el orquestador de WhatsApp.
 *
 * Cada variante del quiz (otro orden, otro tono, otro anuncio) es una
 * secuencia distinta, pero TODAS recogen los mismos cuatro datos con las
 * mismas opciones: un botón guarda su respuesta con `guardar_en_lead` en uno
 * de `CAMPOS_QUIZ`. Así la nota, el informe y la ficha del lead salen igual
 * venga el lead de la variante que venga, y las variantes se pueden comparar.
 *
 * Las tres áreas que puntúan guardan un NIVEL (verde, amarillo, rojo), no el
 * texto del botón: el tono de una variante puede cambiar el texto, el nivel
 * no. La temperatura no puntúa; decide el cierre y la prioridad del lead.
 */

export const AREAS_QUIZ = ["visibilidad", "captacion", "atencion"] as const;
export type AreaQuiz = (typeof AREAS_QUIZ)[number];

export const NIVELES_QUIZ = ["verde", "amarillo", "rojo"] as const;
export type NivelQuiz = (typeof NIVELES_QUIZ)[number];

export const TEMPERATURAS_QUIZ = ["ya", "pronto", "mirando"] as const;
export type TemperaturaQuiz = (typeof TEMPERATURAS_QUIZ)[number];

export const CAMPOS_QUIZ = ["quiz_visibilidad", "quiz_captacion", "quiz_atencion", "quiz_temperatura"] as const;
export type CampoQuiz = (typeof CAMPOS_QUIZ)[number];

/** Variables que el motor rellena con el resultado del quiz al entrar en un paso. */
export const VARIABLES_QUIZ = ["quiz_nota", "quiz_informe"] as const;

/**
 * Clave en `datos` donde un botón deja su respuesta. Es el mismo formato que
 * `claveDatoLead` (secuencias.ts); no se importa de allí porque secuencias.ts
 * importa este módulo, y un test comprueba que siguen diciendo lo mismo.
 */
export function claveQuiz(campo: CampoQuiz): string {
  return `lead.${campo}`;
}

export function esCampoQuiz(campo: string): campo is CampoQuiz {
  return (CAMPOS_QUIZ as readonly string[]).includes(campo);
}

/** Valores que admite cada campo del quiz. */
export function valoresDeCampoQuiz(campo: CampoQuiz): readonly string[] {
  return campo === "quiz_temperatura" ? TEMPERATURAS_QUIZ : NIVELES_QUIZ;
}

const AREA_DE_CAMPO: Record<AreaQuiz, CampoQuiz> = {
  visibilidad: "quiz_visibilidad",
  captacion: "quiz_captacion",
  atencion: "quiz_atencion",
};

const NOMBRE_AREA: Record<AreaQuiz, string> = {
  visibilidad: "Visibilidad",
  captacion: "Captación",
  atencion: "Atención",
};

const EMOJI: Record<NivelQuiz, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴" };

const PUNTOS: Record<NivelQuiz, number> = { verde: 2, amarillo: 1, rojo: 0 };

/** Lo que el informe le dice al contacto de cada área según su nivel. */
const FRASES: Record<AreaQuiz, Record<NivelQuiz, string>> = {
  visibilidad: {
    verde: "te encuentran bien en Google. Base sólida.",
    amarillo: "te encuentran en Maps, pero sin web pierdes a quien quiere ver más antes de llamarte.",
    rojo: "si no te encuentran en Google, para mucha gente no existes.",
  },
  captacion: {
    verde: "Google te trae clientes: tienes un canal que puedes hacer crecer.",
    amarillo: "redes y anuncios funcionan mientras pagas; te falta un canal que traiga clientes solo.",
    rojo: "dependes del boca a boca. Funciona, pero no puedes subirlo cuando lo necesitas.",
  },
  atencion: {
    verde: "contestas rápido, y eso ya te pone por delante de la mayoría.",
    amarillo: "en unas horas el cliente ya ha escrito a otro. Aquí se escapan ventas.",
    rojo: "al día siguiente muchos ya han elegido a otro. Es tu fuga más cara.",
  },
};

/**
 * La mejora que se propone para cada área según su nivel, explicada para
 * alguien que no sabe de marketing: qué hacemos, por qué le importa y qué
 * gana. En rojo y en amarillo es arreglar; en verde, sacarle más partido. Sin
 * cifras ni plazos que no podamos garantizar.
 */
const MEJORAS: Record<AreaQuiz, Record<NivelQuiz, { titulo: string; texto: string }>> = {
  visibilidad: {
    rojo: {
      titulo: "Que te encuentren en Google",
      texto:
        "Tu ficha de Google y una web sencilla con lo que haces, dónde estás y cómo contactarte. Es lo primero que mira un cliente: si no estás, llama al de al lado.",
    },
    amarillo: {
      titulo: "Una web que convenza",
      texto:
        "Ya sales en Maps. Falta una página con tus servicios, fotos y opiniones para que quien te encuentra se decida por ti y no siga buscando.",
    },
    verde: {
      titulo: "Ponerte por delante de tu competencia",
      texto: "Ya sales en Google. Con más reseñas, fotos y novedades en tu ficha, Google te enseña antes que a los de al lado.",
    },
  },
  captacion: {
    rojo: {
      titulo: "Clientes que no dependan de la suerte",
      texto:
        "El boca a boca es genial, pero no lo controlas. Un anuncio bien hecho en Google o Instagram te trae clientes nuevos el mes que tú decidas, y sabes cuánto te cuesta cada uno.",
    },
    amarillo: {
      titulo: "Un canal que trabaje solo",
      texto:
        "Redes y anuncios paran cuando dejas de publicar o de pagar. Bien posicionado en Google, te llegan clientes también los meses que no puedes dedicarle tiempo.",
    },
    verde: {
      titulo: "Más de lo que ya funciona",
      texto: "Google ya te trae clientes. Con una campaña pequeña en los meses flojos subes el ritmo justo cuando lo necesitas.",
    },
  },
  atencion: {
    rojo: {
      titulo: "Contestar antes que nadie",
      texto:
        "Quien pregunta un precio muchas veces escribe a varios negocios a la vez y se queda con el primero que responde. Con respuestas automáticas en WhatsApp contestas al momento, aunque estés trabajando o sea de noche.",
    },
    amarillo: {
      titulo: "De horas a minutos",
      texto:
        "En unas horas el cliente ya ha preguntado a otro. Un mensaje automático con precios y horarios le contesta al instante, y tú sigues la conversación cuando puedas.",
    },
    verde: {
      titulo: "Rápido sin vivir pegado al móvil",
      texto:
        "Ya contestas rápido, ¡bien! Automatizar las preguntas de siempre (precios, horarios, citas) te ahorra horas cada semana sin perder esa rapidez.",
    },
  },
};

/** Cómo se ve cada respuesta en la ficha del lead. */
const RESPUESTA_CRM: Record<AreaQuiz, Record<NivelQuiz, string>> = {
  visibilidad: { verde: "web y ficha de Google", amarillo: "solo ficha de Google", rojo: "nada o casi nada" },
  captacion: { verde: "Google / su web", amarillo: "redes o anuncios", rojo: "boca a boca" },
  atencion: { verde: "en minutos", amarillo: "en unas horas", rojo: "al día siguiente o más" },
};

const TEMPERATURA_CRM: Record<TemperaturaQuiz, string> = {
  ya: "quiere empezar ya 🔥",
  pronto: "en 1-3 meses",
  mirando: "solo está mirando",
};

function leer<T extends string>(datos: Record<string, string>, campo: CampoQuiz, validos: readonly T[]): T | null {
  const valor = datos[claveQuiz(campo)];
  return valor && (validos as readonly string[]).includes(valor) ? (valor as T) : null;
}

/** Los niveles de las tres áreas; `null` si falta alguna (el quiz no ha terminado). */
function niveles(datos: Record<string, string>): Record<AreaQuiz, NivelQuiz> | null {
  const resultado = {} as Record<AreaQuiz, NivelQuiz>;
  for (const area of AREAS_QUIZ) {
    const nivel = leer(datos, AREA_DE_CAMPO[area], NIVELES_QUIZ);
    if (!nivel) return null;
    resultado[area] = nivel;
  }
  return resultado;
}

/** Nota de 0 a 100 (en saltos de 1/6), o `null` si falta alguna área. */
export function notaQuiz(datos: Record<string, string>): number | null {
  const n = niveles(datos);
  if (!n) return null;
  const puntos = AREAS_QUIZ.reduce((suma, area) => suma + PUNTOS[n[area]], 0);
  return Math.round((puntos / (AREAS_QUIZ.length * 2)) * 100);
}

function nivelDeNota(nota: number): NivelQuiz {
  if (nota >= 67) return "verde";
  if (nota >= 34) return "amarillo";
  return "rojo";
}

/**
 * El informe que recibe el contacto, en formato de WhatsApp (`*negrita*`).
 * Siempre trae 3 mejoras, porque es lo que prometen los anuncios: una por
 * área, primero las rojas, luego las amarillas y al final las verdes, en el
 * orden de `AREAS_QUIZ`. `null` si falta alguna área.
 *
 * Con el cierre y los botones pasa de 1024 caracteres: el mensajero lo parte
 * y manda el informe como mensaje normal y la pregunta con los botones
 * (`partirCuerpoBotones`). Por eso el informe acaba siempre en párrafo.
 */
export function informeQuiz(datos: Record<string, string>): string | null {
  const n = niveles(datos);
  const nota = notaQuiz(datos);
  if (!n || nota === null) return null;

  const lineas = AREAS_QUIZ.map((area) => `${EMOJI[n[area]]} *${NOMBRE_AREA[area]}:* ${FRASES[area][n[area]]}`);
  const mejoras = (["rojo", "amarillo", "verde"] as const).flatMap((nivel) =>
    AREAS_QUIZ.filter((area) => n[area] === nivel).map((area) => MEJORAS[area][nivel]),
  );
  const tratamiento = [
    "🚀 *Tus 3 mejoras para conseguir más clientes*",
    ...mejoras.map((m, i) => `*${i + 1}. ${m.titulo}.* ${m.texto}`),
  ].join("\n\n");

  return [`📋 *Tu salud digital: ${nota}/100* ${EMOJI[nivelDeNota(nota)]}`, lineas.join("\n"), tratamiento].join("\n\n");
}

/** Valores de `VARIABLES_QUIZ` para renderizar un paso; `null` mientras el quiz no ha terminado. */
export function valoresQuiz(datos: Record<string, string>): Record<(typeof VARIABLES_QUIZ)[number], string | null> {
  const nota = notaQuiz(datos);
  return { quiz_nota: nota === null ? null : String(nota), quiz_informe: informeQuiz(datos) };
}

/**
 * Lo que ve la comercial en la ficha del lead: nota, cada respuesta y la
 * temperatura. Con el quiz a medias enseña lo que haya; `null` si no hay nada.
 */
export function resumenQuiz(datos: Record<string, string>): string | null {
  const partes: string[] = [];
  const nota = notaQuiz(datos);
  if (nota !== null) partes.push(`${nota}/100`);
  for (const area of AREAS_QUIZ) {
    const nivel = leer(datos, AREA_DE_CAMPO[area], NIVELES_QUIZ);
    if (nivel) partes.push(`${NOMBRE_AREA[area]} ${EMOJI[nivel]} ${RESPUESTA_CRM[area][nivel]}`);
  }
  const temperatura = leer(datos, "quiz_temperatura", TEMPERATURAS_QUIZ);
  if (temperatura) partes.push(`Cuándo: ${TEMPERATURA_CRM[temperatura]}`);
  return partes.length > 0 ? `Chequeo de salud digital: ${partes.join(" · ")}` : null;
}
