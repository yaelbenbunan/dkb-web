/**
 * Las landings por sector, todas dentro de /growth.
 *
 * **Qué cambia y qué no.** Cambian las palabras: la cabecera, la foto, cómo se
 * llama a quien entra, a quién buscan las campañas y las preguntas. El
 * producto —los planes, el precio, el compromiso— es el mismo y se comparte,
 * porque lo es: montar una copia entera por sector significa que el día que
 * suba el precio hay que acordarse de tocarlo en cinco sitios, y no se acuerda
 * nadie.
 *
 * **Por qué merecen página propia igualmente.** Por las preguntas y por las
 * campañas. Anunciar tratamientos estéticos o terapia psicológica tiene
 * restricciones reales en Meta, y quien las sufre quiere saber antes de llamar
 * si las conocemos; y a quién se busca —quien necesita un implante, quien se
 * ha lesionado la espalda— se dice con las palabras de cada gremio.
 *
 * **Lo que se vende es agenda llena, en todos los sectores** (decidido el 25
 * de septiembre de 2026). Hasta entonces a dental, estética y fisioterapia se
 * les vendía «ganar más» con una tabla de beneficio, y el producto incluía un
 * sistema de pacientes, citas y panel. Growth se queda en la captación: landing,
 * campañas y análisis. Lo comprueba un test, para que no vuelva a colarse
 * ninguna promesa de lo que ya no se vende.
 *
 * **El sector viaja con el lead.** Al llegar desde una de estas páginas el
 * desplegable del formulario ya viene puesto, así que el aviso que recibimos dice
 * «Growth — Ana (Fisioterapia)» sin que nadie haya tocado nada. Ver
 * `growth-action.ts`, que ya lo mete en el asunto.
 *
 * Son hijas de `/growth`.
 */

/**
 * Lo que se ofrece en el desplegable del formulario.
 *
 * Vive aquí y no dentro del formulario porque ahora hay dos que lo usan: el
 * propio desplegable y la preselección de cada landing. Con la lista en un solo
 * sitio, un sector cuyo texto no coincidiera exactamente dejaría de
 * preseleccionarse en silencio — y eso no se ve mirando la página.
 */
export const SECTORES_FORMULARIO = [
  "Clínica dental",
  "Centro de estética",
  "Fisioterapia",
  "Psicología",
  "Otro",
] as const;

export interface SectorGrowth {
  /**
   * Último tramo de la ruta: /growth/<slug>.
   *
   * Vacío en la landing general, que vive en /growth a secas y no se genera como
   * ruta hija. Es lo que la mantiene fuera de `SECTORES_GROWTH`.
   */
  slug: string;
  /** Valor exacto del desplegable. `undefined` en la general: ahí sí se pregunta. */
  valorFormulario?: (typeof SECTORES_FORMULARIO)[number];

  metaTitulo: string;
  metaDescripcion: string;

  /**
   * Encima del titular, y solo en las de sector: «Especialistas en captar
   * pacientes para psicólogos».
   *
   * **Dice la especialidad, no solo el destinatario.** Estuvo como «Para
   * consultas de psicología», que señala a quién va dirigida pero no por qué
   * nosotros: cualquier agencia puede poner «para psicólogos» encima de su
   * página. Lo que distingue es que captar pacientes para ese gremio es lo único
   * que hacemos.
   *
   * La general no lo lleva —no tiene a quién dirigirse— y ponerle uno genérico
   * sería una línea que no dice nada robándole aire al titular.
   */
  eyebrow?: string;
  /**
   * El titular, en dos frases: la segunda va en el color del acento.
   *
   * Es el mismo en todas a propósito. Se probó a cambiar la agenda por lo que
   * llena cada gremio —«la cabina», «la camilla»— y no gustó: es jerga que
   * suena a haberla buscado, y «tu agenda» la entiende igual un dentista que
   * una psicóloga. Lo que dice el sector es el rótulo de encima.
   */
  titular: { primera: string; segunda: string };
  /** El subtítulo. `resaltado` se subraya a mano. */
  subtitulo: { antes: string; resaltado: string; despues: string };

  /**
   * Cómo llama este sector a quien entra por la puerta.
   *
   * Un centro de estética no tiene pacientes y una consulta de psicología no
   * tiene clientes. Es una palabra, y es la que delata si la página está escrita
   * para ellos o es la de dentistas con el título cambiado — por eso llega a
   * todas partes: el subtítulo, el formulario y las preguntas comunes.
   */
  termino: { singular: string; plural: string };
  /** El conjunto del gremio, para las preguntas comunes: «es lo mismo para todas las clínicas». */
  todos: string;

  /**
   * Foto de fondo del hero, muy tenue. Es lo que distingue una landing de otra
   * antes de leer una sola palabra.
   *
   * **Opcional a propósito.** Un sector sin foto se queda con el fondo de
   * siempre, que funciona perfectamente; lo que no puede pasar es poner la misma
   * imagen en todas para rellenar, porque entonces no diferencia nada y solo
   * añade medio mega de descarga.
   *
   * La opacidad y el degradado que protege el titular se aplican por CSS y no
   * vienen quemados en el fichero: así se ajustan sin volver a exportar, y el
   * oscurecido usa exactamente el negro del tema en vez de un gris que casi casa.
   */
  imagen?: string;

  /**
   * Lo que le queda al profesional: «Tú encárgate de {tuParte}. Nosotros, de
   * llenarte la agenda.» Un dentista trata, una psicóloga acompaña.
   */
  tuParte: string;
  /**
   * La descripción del paso de campañas. El trabajo es el mismo en todos los
   * sectores; lo que cambia es a quién se busca, y decirlo con las palabras del
   * gremio es lo que hace creíble que lo conocemos. Los otros dos pasos —la
   * landing y el análisis— se cuentan igual para todos.
   */
  campanas: string;

  /**
   * Las preguntas propias del sector, que van ANTES de las comunes.
   *
   * Delante a propósito: quien entra por una landing sectorial llega con la duda
   * de su gremio, no con la de «cómo puede costar tan poco». Si tiene que bajar
   * por seis preguntas genéricas para encontrar la suya, no la encuentra.
   */
  preguntas: { p: string; r: string }[];
}

/**
 * El titular de todas: agenda llena.
 *
 * Era el de psicología desde el 17 de septiembre, y desde el 25 lo es de todas.
 * El de antes —«Llenar tu agenda es fácil. Ganar más, no.»— vendía rentabilidad
 * medida con un sistema que Growth ya no incluye.
 */
const TITULAR = { primera: "¿Huecos en tu agenda?", segunda: "Nosotros los llenamos." };

function subtitulo(plural: string) {
  return {
    antes: "Te traemos ",
    resaltado: plural,
    despues: " nuevos. Tú solo te ocupas de atenderlos.",
  };
}

/** La landing de `/growth`, para quien no llega desde un sector concreto. */
export const GENERAL: SectorGrowth = {
  slug: "",

  metaTitulo: "¿Huecos en tu agenda? Nosotros los llenamos",
  metaDescripcion:
    "Captamos pacientes para tu clínica con una landing propia y campañas en Google y Meta. Desde 199 €/mes y sin permanencia.",

  titular: TITULAR,
  subtitulo: subtitulo("pacientes"),
  termino: { singular: "paciente", plural: "pacientes" },
  todos: "todas las clínicas",

  tuParte: "darle un buen servicio a tus pacientes",
  campanas:
    "Anuncios en Google, en Meta o en los dos, para quien busca una clínica como la tuya cerca de casa. Los creamos, los lanzamos y los llevamos día a día.",

  preguntas: [],
};

export const DENTAL: SectorGrowth = {
  slug: "dental",
  valorFormulario: "Clínica dental",

  metaTitulo: "Captación de pacientes para clínicas dentales — llenamos tu agenda",
  metaDescripcion:
    "Especialistas en captar pacientes para clínicas dentales: landing de captación y campañas en Google y Meta para llenar tu agenda. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar pacientes para clínicas dentales",
  titular: TITULAR,
  subtitulo: subtitulo("pacientes"),
  termino: { singular: "paciente", plural: "pacientes" },
  todos: "todas las clínicas dentales",
  imagen: "/img/landings/growth-dental.jpg",

  tuParte: "tratar a tus pacientes",
  campanas:
    "Anuncios en Google, en Meta o en los dos, para quien busca dentista cerca: implantes, ortodoncia, estética dental. Los creamos, los lanzamos y los llevamos día a día.",

  preguntas: [
    {
      p: "¿Sirve para implantes y ortodoncia, o solo para revisiones?",
      r:
        "Sobre todo para lo caro. Una revisión no aguanta el coste de traer a nadie por " +
        "anuncios; un implante o una ortodoncia sí, y con mucho margen. Por eso las campañas " +
        "se centran en los tratamientos que tú quieras llenar, y cada mes miramos cuál trae " +
        "más solicitudes y a qué coste — y ahí es donde se ajusta la inversión.",
    },
    {
      p: "¿No me llenaréis la agenda de gente que solo viene a la primera visita gratis?",
      r:
        "Es lo que pasa cuando el anuncio promete algo gratis. Aquí qué se anuncia lo " +
        "decides tú: si no quieres primeras visitas gratis, el anuncio y la landing hablan " +
        "del tratamiento y no del regalo, y quien llega viene a por eso. Y si una campaña te " +
        "trae gente que no encaja, nos lo dices y se corrige al mes siguiente.",
    },
  ],
};

export const ESTETICA: SectorGrowth = {
  slug: "estetica",
  valorFormulario: "Centro de estética",

  metaTitulo: "Captación de clientes para centros de estética — llenamos tu agenda",
  metaDescripcion:
    "Especialistas en captar clientes para centros de estética y medicina estética: landing de captación y campañas en Google y Meta para llenar tu agenda. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar clientes para centros de estética",
  titular: TITULAR,
  subtitulo: subtitulo("clientes"),
  termino: { singular: "cliente", plural: "clientes" },
  todos: "todos los centros de estética",
  imagen: "/img/landings/growth-estetica.jpg",

  tuParte: "cuidar a tus clientes",
  campanas:
    "Anuncios en Google, en Meta o en los dos, para quien busca tratamientos faciales, corporales o de medicina estética cerca de ti. Los creamos, los lanzamos y los llevamos día a día.",

  preguntas: [
    {
      p: "¿Se pueden anunciar tratamientos estéticos en Meta sin que tumben la cuenta?",
      r:
        "Sí, pero con cuidado, y es de las primeras cosas que miramos. Meta tiene reglas " +
        "propias para todo lo que toque el cuerpo: nada de fotos de antes y después con " +
        "zoom sobre la zona, nada de prometer resultados y nada de señalar a quien mira por " +
        "su aspecto. Los anuncios se escriben ya sabiendo eso, que es la diferencia entre " +
        "una campaña que rinde y una cuenta publicitaria bloqueada un lunes.",
    },
  ],
};

export const FISIOTERAPIA: SectorGrowth = {
  slug: "fisioterapia",
  valorFormulario: "Fisioterapia",

  metaTitulo: "Captación de pacientes para fisioterapeutas — llenamos tu agenda",
  metaDescripcion:
    "Especialistas en captar pacientes para centros de fisioterapia: landing de captación y campañas en Google y Meta para llenar tu agenda. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar pacientes para fisioterapeutas",
  titular: TITULAR,
  subtitulo: subtitulo("pacientes"),
  termino: { singular: "paciente", plural: "pacientes" },
  todos: "todos los centros de fisioterapia",

  tuParte: "tratar a tus pacientes",
  campanas:
    "Anuncios en Google, en Meta o en los dos, para quien busca fisioterapeuta cerca: una lesión, un dolor de espalda, una recuperación. Los creamos, los lanzamos y los llevamos día a día.",

  preguntas: [
    {
      p: "Trabajo con mutuas. ¿Esto me sirve de algo?",
      r:
        "Sirve justo para lo contrario de la mutua: para llenar los huecos con paciente " +
        "privado, que es el que deja margen. Los anuncios y la landing hablan a quien busca " +
        "fisioterapeuta por su cuenta, así que lo que llega es paciente privado y no otro " +
        "volante más.",
    },
  ],
};

export const PSICOLOGIA: SectorGrowth = {
  slug: "psicologia",
  valorFormulario: "Psicología",

  metaTitulo: "Captación de pacientes para psicólogos — llenamos tu agenda",
  metaDescripcion:
    "Especialistas en captar pacientes para psicólogos: landing de captación y campañas en Google y Meta para llenar tu agenda. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar pacientes para psicólogos",
  titular: TITULAR,
  subtitulo: subtitulo("pacientes"),
  termino: { singular: "paciente", plural: "pacientes" },
  todos: "todas las consultas de psicología",
  imagen: "/img/landings/growth-psicologia.jpg",

  tuParte: "acompañar a tus pacientes",
  campanas:
    "Anuncios en Google, en Meta o en los dos, para quien busca psicólogo: terapia individual, de pareja u online. Los creamos, los lanzamos y los llevamos día a día.",

  preguntas: [
    {
      p: "¿Cuántos pacientes nuevos me vais a traer?",
      r:
        "Depende de tu zona, de lo que ofreces y de lo que inviertas en anuncios, y por eso " +
        "no damos una cifra antes de mirar tu caso. En la reunión te damos una estimación, y " +
        "desde el primer mes sabes cuántas solicitudes te han llegado.",
    },
    {
      p: "¿Se puede hacer publicidad de terapia sin que la rechacen?",
      r:
        "Sí, y es de lo primero que hay que saber hacer. Meta y Google no dejan dar por " +
        "hecho que quien mira el anuncio tiene un problema —nada de «¿tienes ansiedad?»— " +
        "porque eso entra en sus normas sobre salud y características personales. Se escribe " +
        "del otro lado: lo que ofreces tú, no lo que le pasa a él. Cambia la redacción, no " +
        "el resultado.",
    },
    {
      p: "¿Qué datos de mis pacientes pedís?",
      r:
        "Solo los que hacen falta para llamar y dar hora: el formulario de la landing pide " +
        "nombre, teléfono y correo. Nada clínico, ni una nota de sesión. Tus historias " +
        "siguen donde las tengas hoy, y antes de empezar firmamos el contrato de encargo del " +
        "tratamiento que exige la ley.",
    },
  ],
};

/** Las que tienen ruta propia. La general no está: vive en /growth a secas. */
export const SECTORES_GROWTH: SectorGrowth[] = [DENTAL, ESTETICA, FISIOTERAPIA, PSICOLOGIA];

export function sectorPorSlug(slug: string): SectorGrowth | undefined {
  return SECTORES_GROWTH.find((s) => s.slug === slug);
}
