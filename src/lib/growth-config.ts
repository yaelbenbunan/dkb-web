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
