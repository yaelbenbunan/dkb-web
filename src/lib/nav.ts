/**
 * Menú principal. «Imagina tu web» se sacó de aquí el 28-09-2026: la página
 * sigue publicada y accesible por enlace directo, pero no se ofrece en la
 * navegación. Si vuelve a hacer falta, hay un test que lo fija en
 * `__tests__/nav.test.ts` y habrá que quitarlo a propósito.
 */
export const NAV_ITEMS = [
  { label: "Nosotros", href: "/nosotros" },
  { label: "Servicios", href: "/servicios" },
  { label: "Kit Digital", href: "/kit-digital-2026" },
  { label: "Casos de éxito", href: "/casos-de-exito" },
  { label: "Blog", href: "/blog" },
  { label: "Contacto", href: "/contacto" },
] as const;
