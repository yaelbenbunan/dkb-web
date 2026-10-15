/**
 * Colores de la landing de proveedores deportivos.
 *
 * Fijos y no tokens del tema, como `GROWTH_THEME`: la página es oscura siempre,
 * venga el visitante en modo claro o en modo oscuro. El acento es el azul de
 * dinkbit; sobre el fondo casi negro, el texto y los iconos van en un azul más
 * claro (`acentoClaro`) porque `#187bef` se queda corto de contraste ahí.
 */
export const PD = {
  bg: "#0B0C0E",
  superficie: "#15171B",
  campo: "#0F1114",
  linea: "#262A31",
  texto: "#FFFFFF",
  suave: "#B8BDC6",
  acento: "#187bef",
  acentoClaro: "#4DA3FF",
  error: "#FF6B6B",
} as const;

/** Titulares en Anton: el layout de `(deporte)` expone la fuente en esta variable. */
export const TITULO = { fontFamily: "var(--font-pd-titulo), Impact, sans-serif" } as const;
