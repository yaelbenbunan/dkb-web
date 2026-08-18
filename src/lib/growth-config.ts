/**
 * Configuración de la landing de captación del sistema para clínicas.
 *
 * El nombre comercial está sin decidir (ver §14 del documento de producto), así
 * que vive aquí y NINGÚN componente lo escribe literal: cuando se decida, se
 * cambia en este fichero y ya. Lo mismo con la ruta, que además necesitaría un
 * redirect 301 en next.config.ts si cambiara.
 */
export const GROWTH = {
  /** Nombre comercial provisional. */
  name: "Growth",
  /** Ruta de la landing. */
  path: "/growth",
  /**
   * Fuente del vídeo del hero. Mientras sea null, la sección de vídeo no se
   * renderiza: la landing no debe esperar al vídeo para poder publicarse.
   */
  videoSrc: null as string | null,
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
 * El lima es el color del dinero y de lo que se gana; el rojo se reserva para
 * la fuga, es decir para todo lo que ilustra el problema. No mezclarlos.
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
  /** Acento del problema: lo que se fuga. */
  red: "#FF5C4D",
  /** Texto principal. */
  fg: "#F5F7F8",
  /** Texto secundario. */
  muted: "#8E949F",
} as const;
