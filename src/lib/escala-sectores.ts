/**
 * Las landings por sector, todas dentro de /escala.
 *
 * **Qué cambia y qué no.** Cambian las palabras y los números: la cabecera, la
 * foto, cómo se llama a quien entra, la tabla, los pasos y las preguntas. El
 * producto —los planes, el precio, el compromiso— es el mismo y se comparte,
 * porque lo es: montar una copia entera por sector significa que el día que
 * suba el precio hay que acordarse de tocarlo en cinco sitios, y no se acuerda
 * nadie.
 *
 * **Por qué merecen página propia igualmente.** Dos razones que no son de SEO.
 * La primera: los números. El dueño de un centro de fisioterapia no se reconoce
 * en un ticket medio de 250 €, y esa tabla es el argumento entero de la página.
 * La segunda: las preguntas. Anunciar tratamientos estéticos o terapia
 * psicológica tiene restricciones reales en Meta, y quien las sufre quiere saber
 * antes de llamar si las conocemos.
 *
 * **El sector viaja con el lead.** Al llegar desde una de estas páginas el
 * desplegable del formulario ya viene puesto, así que el aviso que recibimos dice
 * «Growth — Ana (Fisioterapia)» sin que nadie haya tocado nada. Ver
 * `growth-action.ts`, que ya lo mete en el asunto.
 *
 * No se inventa ninguna ruta nueva: son hijas de `/escala`, que es lo que se
 * pidió, y el 301 de `/growth/:slug*` ya las cubre.
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

/**
 * Sin nosotros y con nosotros, en dinero.
 *
 * El ticket, cuando hay `repite`, es el precio de **una** sesión o visita, no lo
 * que deja el cliente entero. Estuvo al revés —300 € de «ticket medio» en
 * psicología— y nadie del gremio se lo cree: lee «ticket» como precio de sesión.
 * Se enseñan las dos piezas por separado y la factura sale de multiplicarlas,
 * que es la cuenta que hace el lector de cabeza.
 */
export interface ComparativaBeneficio {
  tipo: "beneficio";
  ticket: string;
  /** En los gremios donde se viene varias veces: cuántas, y cómo se rotula. */
  repite?: { rotuloPrecio: string; rotuloVeces: string; veces: string };
  sin: FilaComparativa;
  con: FilaComparativa;
}

/**
 * Sin nosotros y con nosotros, en agenda.
 *
 * Para quien su reto es llenar la semana, no exprimir cada euro. Las cifras son
 * de una semana tipo y tienen que cuadrar entre sí: huecos = capacidad −
 * ocupadas, y el porcentaje sale de dividir. Lo comprueba un test.
 */
export interface ComparativaAgenda {
  tipo: "agenda";
  /** Cuántas sesiones caben en su semana. */
  capacidad: string;
  sin: FilaAgenda;
  con: FilaAgenda;
}

export interface FilaAgenda {
  /** Pacientes nuevos al mes. */
  nuevos: string;
  /** Sesiones ocupadas a la semana. */
  ocupadas: string;
  /** Huecos libres a la semana. */
  libres: string;
  /** El porcentaje de agenda ocupada, que es la cifra grande. */
  ocupacion: string;
  remate: string;
}

export interface FilaComparativa {
  /** Cuántos entran al mes. */
  entran: string;
  /** Lo que cuesta traerlos. */
  gasto: string;
  factura: string;
  queda: string;
  remate: string;
}

export interface SectorEscala {
  /**
   * Último tramo de la ruta: /escala/<slug>.
   *
   * Vacío en la landing general, que vive en /escala a secas y no se genera como
   * ruta hija. Es lo que la mantiene fuera de `SECTORES_ESCALA`.
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
   * El titular, en dos frases: la segunda va en lima.
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
   * todas partes: los pasos, los planes y las preguntas comunes.
   */
  termino: { singular: string; plural: string };
  /** Cómo se llama el negocio en la comparativa: «Clínica sin escala», «Centro…». */
  negocio: string;
  /**
   * El negocio con artículo, para las preguntas comunes: «¿Tengo que cambiar
   * el programa que uso en la consulta?». `todos` es el plural: «es el mismo
   * para todos los centros».
   */
  local: { uno: string; todos: string };
  /**
   * Los programas de gestión que el lector reconoce como suyos, si los hay.
   *
   * Solo donde sabemos cuáles usa el gremio. Nombrar Gesden a una psicóloga
   * delata que la respuesta se escribió para dentistas; sin nombres, se habla
   * de «tu programa de gestión» y vale para cualquiera.
   */
  gestores?: string;

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

  /** Titular de la sección del problema. */
  tituloProblema: string;
  /**
   * Lo que le queda al profesional: «Tú encárgate de {tuParte}. Nosotros, de
   * todo lo demás.» Un dentista trata, una psicóloga acompaña.
   */
  tuParte: string;
  /**
   * Las descripciones de dos de los tres pasos. El trabajo es el mismo en todos
   * los sectores; lo que cambia es a quién se busca y qué se mide, y decirlo con
   * las palabras del gremio es lo que hace creíble que lo conocemos.
   */
  pasos: {
    traemos: string;
    analizamos: string;
    /**
     * El título del tercer paso, si no es «Analizamos tu rentabilidad». A quien
     * le vendemos agenda llena, hablarle de rentabilidad en el paso final le
     * cambia el argumento a mitad de página.
     */
    tituloAnalizamos?: string;
  };
  /** Cómo se llama el panel en la tabla de planes. Por defecto, «Panel de rentabilidad». */
  panel?: string;

  /**
   * La tabla del bloque del problema: qué le pasa a este negocio sin nosotros y
   * con nosotros.
   *
   * **No todos los sectores compran lo mismo.** A una clínica dental le vende el
   * beneficio: puede tener la agenda llena y perder dinero. A una consulta de
   * psicología no: su problema es tener huecos, y una tabla de ticket, gasto y
   * factura le hablaba de un problema que no tiene. Por eso hay dos tablas.
   */
  comparativa: ComparativaBeneficio | ComparativaAgenda;

  /**
   * Las preguntas propias del sector, que van ANTES de las comunes.
   *
   * Delante a propósito: quien entra por una landing sectorial llega con la duda
   * de su gremio, no con la de «cómo puede costar tan poco». Si tiene que bajar
   * por siete preguntas genéricas para encontrar la suya, no la encuentra.
   */
  preguntas: { p: string; r: string }[];
}

const REMATE_SIN = "Trabaja a tope. Y cobra por trabajar, no por ganar.";

const TITULAR = { primera: "Llenar tu agenda es fácil.", segunda: "Ganar más, no." };
const PROBLEMA = "Puedes tener la agenda llena y estar perdiendo dinero.";

function subtitulo(plural: string) {
  return {
    antes: `Cualquiera te trae ${plural}. Nosotros te hacemos `,
    resaltado: "ganar más",
    despues: ".",
  };
}

/**
 * La landing de siempre, la de `/escala`.
 *
 * Sus textos y sus cifras son **exactamente** los que había antes de que esto se
 * parametrizara: el objetivo del cambio era que pudieran existir hermanas por
 * sector, no tocar la que ya recibe tráfico.
 */
export const GENERAL: SectorEscala = {
  slug: "",

  metaTitulo: "Llenar tu agenda es fácil. Ganar más, no",
  metaDescripcion:
    "Un sistema integral que se ocupa de todo el proceso, con un único objetivo: que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  titular: TITULAR,
  subtitulo: subtitulo("pacientes"),
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Clínica",
  local: { uno: "la clínica", todos: "todas las clínicas" },
  gestores: "Gesden, Clinic Cloud",

  tituloProblema: PROBLEMA,
  tuParte: "darle un buen servicio a tus pacientes",
  pasos: {
    traemos:
      "Campañas en Google y Meta gestionadas por el mismo equipo. Cada paciente entra en tu sistema con su ficha, su origen y su cita en tu calendario.",
    analizamos: "Quién acudió, qué se hizo y cuánto facturó. Con eso ajustamos las campañas cada mes.",
  },

  comparativa: {
    tipo: "beneficio",
    ticket: "250 €",
    sin: {
      entran: "40",
      gasto: "8.000 €",
      factura: "10.000 €",
      queda: "2.000 €",
      remate: REMATE_SIN,
    },
    con: {
      entran: "20",
      gasto: "1.000 €",
      factura: "5.000 €",
      queda: "4.000 €",
      remate: "La mitad de pacientes. El doble de beneficio.",
    },
  },

  preguntas: [],
};

export const DENTAL: SectorEscala = {
  slug: "dental",
  valorFormulario: "Clínica dental",

  metaTitulo: "Captación de pacientes para clínicas dentales — llenar la agenda es fácil, ganar más no",
  metaDescripcion:
    "Especialistas en captar pacientes para clínicas dentales: web, campañas y sistema de pacientes, con un único objetivo: que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar pacientes para clínicas dentales",
  titular: TITULAR,
  subtitulo: subtitulo("pacientes"),
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Clínica",
  local: { uno: "la clínica", todos: "todas las clínicas dentales" },
  gestores: "Gesden, Clinic Cloud",
  imagen: "/img/landings/escala-dental.jpg",

  tituloProblema: PROBLEMA,
  tuParte: "tratar a tus pacientes",
  pasos: {
    traemos:
      "Campañas en Google y Meta para quien busca dentista cerca: implantes, ortodoncia, estética dental. Cada paciente entra en tu sistema con su ficha, su origen y su cita.",
    analizamos:
      "Quién acudió, qué tratamiento aceptó y cuánto facturó. Con eso ajustamos las campañas cada mes.",
  },

  // En dental sí vale un ticket medio por paciente: entre la primera visita y el
  // presupuesto que acepta, es la cifra con la que el sector ya hace cuentas.
  comparativa: {
    tipo: "beneficio",
    ticket: "250 €",
    sin: {
      entran: "40",
      gasto: "8.000 €",
      factura: "10.000 €",
      queda: "2.000 €",
      remate: REMATE_SIN,
    },
    con: {
      entran: "20",
      gasto: "1.000 €",
      factura: "5.000 €",
      queda: "4.000 €",
      remate: "La mitad de pacientes. El doble de beneficio.",
    },
  },

  preguntas: [
    {
      p: "¿Sirve para implantes y ortodoncia, o solo para revisiones?",
      r:
        "Sobre todo para lo caro. Una revisión no aguanta el coste de traer a nadie por " +
        "anuncios; un implante o una ortodoncia sí, y con mucho margen. Lo que hacemos es " +
        "medir cuánto factura de verdad cada paciente que entra, así que a los dos meses " +
        "sabes qué tratamiento te está pagando las campañas y cuál no — y ahí es donde se " +
        "ajusta la inversión.",
    },
    {
      p: "¿No me llenaréis la agenda de gente que solo viene a la primera visita gratis?",
      r:
        "Es lo que pasa cuando una campaña se mide por citas. Aquí se mide por lo que " +
        "factura cada paciente, así que si una campaña trae primeras visitas que no acaban " +
        "en ningún presupuesto aceptado, se ve en el panel ese mismo mes y se corrige. Qué " +
        "se anuncia lo decides tú, sabiendo ya qué trae cada cosa.",
    },
  ],
};

export const ESTETICA: SectorEscala = {
  slug: "estetica",
  valorFormulario: "Centro de estética",

  metaTitulo: "Captación de clientes para centros de estética — llenar la agenda es fácil, ganar más no",
  metaDescripcion:
    "Especialistas en captar clientes para centros de estética y medicina estética: web, campañas y sistema de clientes. Que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar clientes para centros de estética",
  titular: TITULAR,
  subtitulo: subtitulo("clientes"),
  termino: { singular: "cliente", plural: "clientes" },
  negocio: "Centro",
  local: { uno: "el centro", todos: "todos los centros de estética" },
  imagen: "/img/landings/escala-estetica.jpg",

  tituloProblema: PROBLEMA,
  tuParte: "cuidar a tus clientes",
  pasos: {
    traemos:
      "Campañas en Google y Meta para quien busca tratamientos faciales, corporales o de medicina estética cerca de ti. Cada cliente entra en tu sistema con su ficha, su origen y su cita.",
    analizamos:
      "Quién vino, qué tratamientos se hizo y cuánto lleva dejado desde que entró. Con eso ajustamos las campañas cada mes.",
  },

  comparativa: {
    tipo: "beneficio",
    ticket: "80 €",
    repite: { rotuloPrecio: "Precio por visita", rotuloVeces: "Visitas por cliente", veces: "5" },
    sin: {
      entran: "30",
      gasto: "9.600 €",
      factura: "12.000 €",
      queda: "2.400 €",
      remate: REMATE_SIN,
    },
    con: {
      entran: "15",
      gasto: "1.200 €",
      factura: "6.000 €",
      queda: "4.800 €",
      remate: "La mitad de clientes. El doble de beneficio.",
    },
  },

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
    {
      p: "Mis clientes repiten cada mes. ¿Eso lo mide?",
      r:
        "Ahí está lo interesante. El sistema apunta lo que factura cada visita, así que lo " +
        "que ves no es solo lo que dejó la primera vez, sino lo que lleva dejado desde que " +
        "entró. En un negocio de repetición esa es la cifra que decide si una campaña vale " +
        "la pena: el primer tratamiento puede salir a cero y la clienta ser rentabilísima " +
        "al cuarto mes.",
    },
  ],
};

export const FISIOTERAPIA: SectorEscala = {
  slug: "fisioterapia",
  valorFormulario: "Fisioterapia",

  metaTitulo: "Captación de pacientes para fisioterapeutas — llenar la agenda es fácil, ganar más no",
  metaDescripcion:
    "Especialistas en captar pacientes para centros de fisioterapia: web, campañas y sistema de pacientes. Que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar pacientes para fisioterapeutas",
  titular: TITULAR,
  subtitulo: subtitulo("pacientes"),
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Centro",
  local: { uno: "el centro", todos: "todos los centros de fisioterapia" },

  tituloProblema: PROBLEMA,
  tuParte: "tratar a tus pacientes",
  pasos: {
    traemos:
      "Campañas en Google y Meta para quien busca fisioterapeuta cerca: una lesión, un dolor de espalda, una recuperación. Cada paciente entra en tu sistema con su ficha, su origen y su cita.",
    analizamos:
      "Quién vino, cuántas sesiones hizo y cuánto facturó. Con eso ajustamos las campañas cada mes.",
  },

  comparativa: {
    tipo: "beneficio",
    ticket: "45 €",
    repite: { rotuloPrecio: "Precio por sesión", rotuloVeces: "Sesiones por paciente", veces: "5" },
    sin: {
      entran: "40",
      gasto: "7.000 €",
      factura: "9.000 €",
      queda: "2.000 €",
      remate: REMATE_SIN,
    },
    con: {
      entran: "20",
      gasto: "500 €",
      factura: "4.500 €",
      queda: "4.000 €",
      remate: "La mitad de pacientes. El doble de beneficio.",
    },
  },

  preguntas: [
    {
      p: "Trabajo con mutuas. ¿Esto me sirve de algo?",
      r:
        "Sirve justo para lo contrario de la mutua: para llenar los huecos con paciente " +
        "privado, que es el que deja margen. El sistema separa de dónde viene cada uno, así " +
        "que a los dos meses ves en un número qué parte de tu agenda es de mutua y qué parte " +
        "te está pagando de verdad las facturas. Con eso se decide cuánto invertir, no antes.",
    },
    {
      p: "Mi paciente no viene una vez, viene diez. ¿Se nota en las cifras?",
      r:
        "Sí, y es lo que cambia la conversación. Si solo se mira la primera sesión, captar " +
        "un paciente parece caro; cuando lo que se mide es el bono entero, la cuenta sale " +
        "distinta. El sistema apunta cada visita y lo que facturó, así que el retorno que " +
        "ves es el del tratamiento completo y no el de una sesión suelta.",
    },
  ],
};

export const PSICOLOGIA: SectorEscala = {
  slug: "psicologia",
  valorFormulario: "Psicología",

  metaTitulo: "Captación de pacientes para psicólogos — llenamos tu agenda",
  metaDescripcion:
    "Especialistas en captar pacientes para psicólogos: web, campañas y un sistema para que tu agenda esté llena. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Especialistas en captar pacientes para psicólogos",
  /**
   * **A una consulta de psicología no se le vende «ganar más».** Su reto es
   * tener la agenda llena: la sesión tiene un precio que no se estira y un
   * profesional solo puede atender las horas que tiene. Lo que le cambia el mes
   * son los huecos, así que toda esta landing habla de llenarlos (decidido el
   * 17 de septiembre de 2026).
   */
  titular: { primera: "¿Huecos en tu agenda?", segunda: "Nosotros los llenamos." },
  subtitulo: {
    antes: "Te traemos ",
    resaltado: "pacientes",
    despues: " nuevos. Tú solo te ocupas de atenderlos.",
  },
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Consulta",
  local: { uno: "la consulta", todos: "todas las consultas de psicología" },
  imagen: "/img/landings/escala-psicologia.jpg",

  tituloProblema: "Puedes ser muy buen profesional y tener la agenda a medias.",
  tuParte: "acompañar a tus pacientes",
  pasos: {
    traemos:
      "Campañas en Google y Meta para quien busca psicólogo: terapia individual, de pareja u online. Cada paciente entra en tu sistema con su ficha, su origen y su primera cita.",
    tituloAnalizamos: "Medimos qué te trae pacientes",
    analizamos:
      "Qué campaña trae a cada paciente y cuántos se quedan a seguir. Con eso ajustamos las campañas cada mes.",
  },
  panel: "Panel de resultados",

  // Una semana tipo de una consulta privada: 25 sesiones de hueco. Sin
  // captación se llena con el boca a boca y se queda en torno al 60 %.
  comparativa: {
    tipo: "agenda",
    capacidad: "25",
    sin: {
      nuevos: "2",
      ocupadas: "15",
      libres: "10",
      ocupacion: "60 %",
      remate: "Buena consulta. Agenda a medias.",
    },
    con: {
      nuevos: "6",
      ocupadas: "23",
      libres: "2",
      ocupacion: "92 %",
      remate: "Tú atiendes. Nosotros llenamos la agenda.",
    },
  },

  preguntas: [
    {
      p: "¿Cuántos pacientes nuevos me vais a traer?",
      r:
        "Depende de tu zona, de lo que ofreces y de lo que inviertas en anuncios, y por eso " +
        "no damos una cifra antes de mirar tu caso. En la reunión te damos una estimación, y " +
        "desde el primer mes ves en el panel cuántos han llegado, de qué campaña y cuántos " +
        "siguen viniendo.",
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
      p: "¿Dónde quedan los datos de mis pacientes?",
      r:
        "En servidores de la Unión Europea, y en el sistema solo entra lo que hace falta " +
        "para llamar y dar hora: nombre, teléfono, correo y de qué campaña vino. Nada " +
        "clínico, ni una nota de sesión. Tus historias siguen donde las tengas hoy, y antes " +
        "de empezar firmamos el contrato de encargo del tratamiento que exige la ley.",
    },
  ],
};

/** Las que tienen ruta propia. La general no está: vive en /escala a secas. */
export const SECTORES_ESCALA: SectorEscala[] = [DENTAL, ESTETICA, FISIOTERAPIA, PSICOLOGIA];

export function sectorPorSlug(slug: string): SectorEscala | undefined {
  return SECTORES_ESCALA.find((s) => s.slug === slug);
}
