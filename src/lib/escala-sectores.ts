/**
 * Las landings por sector, todas dentro de /escala.
 *
 * **Qué cambia y qué no.** Cambian la cabecera, los números de la comparativa y
 * las preguntas frecuentes. El resto —los tres pasos, los planes, el precio, el
 * compromiso— es el mismo producto y se comparte, porque lo es: montar una copia
 * entera por sector significa que el día que suba el precio hay que acordarse de
 * tocarlo en cinco sitios, y no se acuerda nadie.
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
   * Encima del titular, y solo en las de sector.
   *
   * La general no lo lleva —no tiene a quién dirigirse— y ponerle uno genérico
   * sería una línea que no dice nada robándole aire al titular.
   */
  eyebrow?: string;
  /** El titular, en dos frases: la segunda va en lima. */
  titular: { primera: string; segunda: string };
  /** El subtítulo. `resaltado` se subraya a mano. */
  subtitulo: { antes: string; resaltado: string; despues: string };

  /**
   * Cómo llama este sector a quien entra por la puerta.
   *
   * Un centro de estética no tiene pacientes y una consulta de psicología no
   * tiene clientes. Es una palabra, y es la que delata si la página está escrita
   * para ellos o es la de dentistas con el título cambiado.
   */
  termino: { singular: string; plural: string };
  /** Cómo se llama el negocio en la comparativa: «Clínica sin escala», «Centro…». */
  negocio: string;

  /** Titular de la sección del problema. */
  tituloProblema: string;

  /** El ticket medio que se usa en la tabla. */
  ticket: string;
  sinEscala: FilaComparativa;
  conEscala: FilaComparativa;

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

  titular: { primera: "Llenar tu agenda es fácil.", segunda: "Ganar más, no." },
  subtitulo: {
    antes: "Cualquiera te trae pacientes. Nosotros te hacemos ",
    resaltado: "ganar más",
    despues: ".",
  },
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Clínica",

  tituloProblema: "Puedes tener la agenda llena y estar perdiendo dinero.",
  ticket: "250 €",
  sinEscala: {
    entran: "40",
    gasto: "8.000 €",
    factura: "10.000 €",
    queda: "2.000 €",
    remate: REMATE_SIN,
  },
  conEscala: {
    entran: "20",
    gasto: "1.000 €",
    factura: "5.000 €",
    queda: "4.000 €",
    remate: "La mitad de pacientes. El doble de beneficio.",
  },

  preguntas: [],
};

export const DENTAL: SectorEscala = {
  slug: "dental",
  valorFormulario: "Clínica dental",

  metaTitulo: "Marketing para clínicas dentales — llenar la agenda es fácil, ganar más no",
  metaDescripcion:
    "Web, campañas y sistema de pacientes para clínicas dentales, con un único objetivo: que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Para clínicas dentales",
  titular: { primera: "Llenar tu agenda es fácil.", segunda: "Ganar más, no." },
  subtitulo: {
    antes: "Cualquiera te trae pacientes. Nosotros te hacemos ",
    resaltado: "ganar más",
    despues: ".",
  },
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Clínica",

  tituloProblema: "Puedes tener la agenda llena y estar perdiendo dinero.",
  ticket: "250 €",
  sinEscala: {
    entran: "40",
    gasto: "8.000 €",
    factura: "10.000 €",
    queda: "2.000 €",
    remate: REMATE_SIN,
  },
  conEscala: {
    entran: "20",
    gasto: "1.000 €",
    factura: "5.000 €",
    queda: "4.000 €",
    remate: "La mitad de pacientes. El doble de beneficio.",
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
      p: "¿Tengo que cambiar Gesden, Clinic Cloud o el programa que uso?",
      r:
        "No. Tu recepción sigue dando hora donde la da hoy. El sistema no sustituye a tu " +
        "gestor dental: lo que mide es de dónde viene cada paciente nuevo y cuánto factura, " +
        "no dónde está escrita la cita. Si además tenéis la agenda en Google Calendar, la " +
        "conectamos y las citas de campañas se escriben solas.",
    },
  ],
};

export const ESTETICA: SectorEscala = {
  slug: "estetica",
  valorFormulario: "Centro de estética",

  metaTitulo: "Marketing para centros de estética — llenar la agenda es fácil, ganar más no",
  metaDescripcion:
    "Web, campañas y sistema de clientes para centros de estética y medicina estética. Que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Para centros de estética",
  titular: { primera: "Llenar la cabina es fácil.", segunda: "Ganar más, no." },
  subtitulo: {
    antes: "Cualquiera te trae clientes. Nosotros te hacemos ",
    resaltado: "ganar más",
    despues: ".",
  },
  termino: { singular: "cliente", plural: "clientes" },
  negocio: "Centro",

  tituloProblema: "Puedes tener la cabina llena y estar perdiendo dinero.",
  ticket: "400 €",
  sinEscala: {
    entran: "30",
    gasto: "9.000 €",
    factura: "12.000 €",
    queda: "3.000 €",
    remate: REMATE_SIN,
  },
  conEscala: {
    entran: "15",
    gasto: "1.200 €",
    factura: "6.000 €",
    queda: "4.800 €",
    remate: "La mitad de clientes. El doble de beneficio.",
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

  metaTitulo: "Marketing para fisioterapia — llenar la agenda es fácil, ganar más no",
  metaDescripcion:
    "Web, campañas y sistema de pacientes para centros de fisioterapia. Que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Para centros de fisioterapia",
  titular: { primera: "Llenar la camilla es fácil.", segunda: "Ganar más, no." },
  subtitulo: {
    antes: "Cualquiera te trae pacientes. Nosotros te hacemos ",
    resaltado: "ganar más",
    despues: ".",
  },
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Centro",

  tituloProblema: "Puedes tener la agenda llena y estar perdiendo dinero.",
  // El ticket no es la sesión suelta: es lo que deja un paciente nuevo en el
  // tratamiento entero, que es la cifra con la que se decide si sale a cuenta.
  ticket: "180 €",
  sinEscala: {
    entran: "50",
    gasto: "7.500 €",
    factura: "9.000 €",
    queda: "1.500 €",
    remate: REMATE_SIN,
  },
  conEscala: {
    entran: "25",
    gasto: "900 €",
    factura: "4.500 €",
    queda: "3.600 €",
    remate: "La mitad de pacientes. El doble de beneficio.",
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

  metaTitulo: "Marketing para psicólogos — llenar la agenda es fácil, ganar más no",
  metaDescripcion:
    "Web, campañas y sistema de pacientes para consultas de psicología. Que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",

  eyebrow: "Para consultas de psicología",
  titular: { primera: "Llenar tu agenda es fácil.", segunda: "Ganar más, no." },
  subtitulo: {
    antes: "Cualquiera te trae pacientes. Nosotros te hacemos ",
    resaltado: "ganar más",
    despues: ".",
  },
  termino: { singular: "paciente", plural: "pacientes" },
  negocio: "Consulta",

  tituloProblema: "Puedes tener la agenda llena y estar perdiendo dinero.",
  // Lo que deja un paciente a lo largo del proceso, no la sesión suelta.
  ticket: "300 €",
  sinEscala: {
    entran: "25",
    gasto: "6.000 €",
    factura: "7.500 €",
    queda: "1.500 €",
    remate: REMATE_SIN,
  },
  conEscala: {
    entran: "14",
    gasto: "800 €",
    factura: "4.200 €",
    queda: "3.400 €",
    remate: "La mitad de pacientes. El doble de beneficio.",
  },

  preguntas: [
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
