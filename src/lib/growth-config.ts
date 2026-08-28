import { CONTACT_INFO } from "./contact-info";

/**
 * Configuración de la landing de captación del sistema para clínicas.
 *
 * El nombre comercial vive aquí y NINGÚN componente lo escribe literal: si
 * cambia, se cambia en este fichero. Lo mismo con la ruta — y esa además
 * necesita un redirect 301 en next.config.ts, como el que ya hay de /growth,
 * que se queda para siempre.
 *
 * **"Escala" todavía no está cerrado del todo** (§14 del documento de
 * producto). Está puesto porque la landing no puede seguir llamándose "growth"
 * mientras se decide, y porque cambiarlo ahora —sin campañas en marcha— cuesta
 * una redirección y nada más.
 */
export const GROWTH = {
  /** Nombre comercial. */
  name: "Escala",
  /** Ruta de la landing. */
  path: "/escala",
  /**
   * Fuente del vídeo del hero. Mientras sea null, la sección de vídeo no se
   * renderiza: la landing no debe esperar al vídeo para poder publicarse.
   */
  videoSrc: null as string | null,
  /**
   * Enlace para agendar una videollamada de demostración.
   *
   * Mientras sea null, el enlace no aparece — igual que el vídeo. Va como
   * segunda opción y nunca como botón al lado del formulario: dos llamadas a la
   * acción del mismo tamaño no suman, se reparten. El formulario captura a
   * quien quiere que le llamen, que son más; esto es para quien prefiere verlo
   * antes de dar su teléfono.
   *
   * Apunta al Calendly de dinkbit, y **se lee de `contact-info.ts` en vez de
   * copiarlo**: ese fichero ya es la única fuente del teléfono, el correo y
   * esta agenda, y una segunda copia es la que se queda vieja el día que
   * cambie.
   *
   * Es el enlace general, así que enseña todos los tipos de reunión que haya
   * configurados. Lo suyo es crear uno propio de 15 minutos para esta landing
   * —cuanto más corta se anuncie, más gente la coge— y apuntar aquí a ése.
   *
   * Hacerlo con nuestro propio sistema —el mismo que agenda a los pacientes de
   * las clínicas— es posible y sería un argumento de venta bonito, pero pide
   * bastante más de lo que tenemos hecho: invitación al asistente, enlace de
   * videollamada, cancelar y cambiar la hora, y protección contra reservas
   * basura.
   */
  demoUrl: CONTACT_INFO.calendly as string | null,
} as const;

/**
 * Paleta propia del producto, deliberadamente ajena a la del resto de dinkbit.
 *
 * Existe por dos razones:
 *
 * 1. Diferenciación. Esta landing compite contra cientos de agencias que
 *    prometen "llenarte la agenda", y el sector entero es azul clarito. Un
 *    fondo casi negro con un lima eléctrico rompe con eso de un vistazo.
 *
 * 2. Inmunidad al tema. Los tokens del sitio (`text-fg`, `surface-elevated`…)
 *    cambian con el interruptor claro/oscuro, y esa dependencia ya provocó que
 *    la calculadora quedara ilegible: texto casi blanco sobre un panel que es
 *    claro en LOS DOS temas. Aquí los colores son explícitos y no dependen de
 *    nada externo, así que ese fallo no puede repetirse.
 *
 * **Hay UN acento y solo uno.** Hubo dos —lima para lo que se gana, rojo y
 * luego ámbar para el problema— y era peor: con dos colores el lector tiene que
 * ir aprendiendo qué significa cada uno mientras lee, y el rojo además sonaba a
 * reproche justo donde el dueño de la clínica tiene que reconocerse sin
 * ponerse a la defensiva.
 *
 * Con un solo acento, el lima quiere decir siempre lo mismo: esto importa. Y lo
 * que antes distinguía el color ahora lo distingue el sitio — la clínica que va
 * mal se pinta en gris y la que va bien en lima, así que la comparación se ve
 * antes de leerla.
 *
 * Para remarcar dentro de una frase está `Subrayado`, un trazo torcido a mano.
 * Ver el porqué en ese componente.
 */
export const GROWTH_THEME = {
  /** Fondo principal, casi negro. */
  ink: "#08090C",
  /** Fondo de tarjetas y bloques elevados. */
  surface: "#131519",
  /** Bordes y separadores. */
  line: "#23262E",
  /** Acento principal: lo que se gana. */
  lime: "#C7F73E",
  /** Texto principal. */
  fg: "#F5F7F8",
  /** Texto secundario. */
  muted: "#8E949F",
} as const;
