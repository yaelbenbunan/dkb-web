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
