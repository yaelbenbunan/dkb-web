/**
 * Contenido de la landing de desarrollo web a precio cerrado de 299€.
 *
 * Producto DISTINTO de `web-express-landings.ts`, que vende la web de nicho a
 * 459€ con un formulario de cualificación largo. Aquí el precio es más bajo, la
 * oferta es genérica (no por nicho) y el formulario pide solo nombre, teléfono
 * y email: a este precio y con tráfico de pago, cada campo de más es gente que
 * se cae antes de enviarlo.
 *
 * Todo el copy vive aquí para poder ajustar precios y textos sin tocar la
 * maquetación. Los tres precios van SEPARADOS a propósito: la web se paga una
 * vez, el alojamiento y el dominio son anuales y no están incluidos, igual que
 * en la oferta de 459€ («Dominio y alojamiento… son unos 100€/año»).
 */

export const WEB_299_PRICE = "299€";
export const WEB_299_HOSTING = "100€";
export const WEB_299_DOMAIN = "25€";
/** Días laborables de entrega. Mismo proceso de producción que la web de nicho. */
export const WEB_299_DAYS = 5;

export const WEB_299_PATH = "/web-299";
export const WEB_299_ORIGIN = "Landing Web 299€";
export const WEB_299_CAMPAIGN = "web-299";
/** Condiciones del servicio: se reutilizan las de web express, que es el mismo
 *  proceso de trabajo (rondas de cambios, plazos de material). */
export const WEB_299_TERMS_PATH = "/condiciones-web-express";

export const WEB_299_META_TITLE = `Página web profesional por ${WEB_299_PRICE} | dinkbit`;
export const WEB_299_META_DESCRIPTION = `Desarrollamos tu web de una página (one page) con 5 o 6 secciones por ${WEB_299_PRICE}, lista en ${WEB_299_DAYS} días laborables. Precio cerrado, sin cuotas mensuales. Alojamiento ${WEB_299_HOSTING}/año y dominio ${WEB_299_DOMAIN}/año aparte.`;

/** Las tres líneas del hero. Cortas: se leen de un vistazo en el móvil. */
export const WEB_299_HERO_BULLETS = [
  `Precio cerrado de ${WEB_299_PRICE}, pago único`,
  `Lista en ${WEB_299_DAYS} días laborables`,
  "Sin cuotas mensuales por la web",
] as const;

/**
 * El desglose, en tarjetas y sin letra pequeña. Va arriba, justo debajo del
 * hero: esconder el coste real hasta el final es lo que hace que la gente
 * desconfíe y se vaya, y aquí la ventaja competitiva ES el precio.
 */
export const WEB_299_PRICING = [
  {
    label: "Tu página web",
    price: WEB_299_PRICE,
    period: "pago único",
    detail: "Una sola página con 5 o 6 secciones, entera. No hay cuota mensual por la web.",
    highlight: true,
  },
  {
    label: "Alojamiento",
    price: WEB_299_HOSTING,
    period: "al año",
    detail: "No incluido. Si quieres, lo gestionamos nosotros por ese precio.",
    highlight: false,
  },
  {
    label: "Dominio",
    price: WEB_299_DOMAIN,
    period: "al año",
    detail: "No incluido. Tu dirección, del tipo tunegocio.es.",
    highlight: false,
  },
] as const;

export const WEB_299_INCLUDES = [
  "Una sola página (one page) con 5 o 6 secciones: quién eres, qué ofreces, cómo trabajas, precios, dónde estás y contacto.",
  "Diseño adaptado a tu negocio: tus colores, tus textos y tus fotos.",
  "Se ve bien en móvil, tablet y ordenador.",
  "Formulario de contacto que te llega a tu correo.",
  "Botón de WhatsApp y de llamada, para que te escriban en un toque.",
  "Aviso legal, política de privacidad y cookies.",
  "Una ronda de cambios incluida.",
] as const;

export const WEB_299_EXCLUDES = [
  `Alojamiento (${WEB_299_HOSTING}/año) y dominio (${WEB_299_DOMAIN}/año).`,
  "Tienda online o pasarela de pago.",
  "Reserva de cita online (te lo presupuestamos aparte).",
  "Blog o publicación de artículos.",
  "Redacción de textos y sesión de fotos: los aportas tú.",
  "Diseño de logotipo.",
] as const;

export const WEB_299_STEPS = [
  {
    title: "Nos dejas tus datos",
    description:
      "Nombre, teléfono y correo. Nada más. Te llamamos o te escribimos por WhatsApp, como prefieras.",
  },
  {
    title: "Nos cuentas tu negocio",
    description:
      "Una conversación de veinte minutos y un cuestionario corto. Con eso elegimos la estructura y la adaptamos a lo que vendes.",
  },
  {
    title: "La tienes publicada",
    description: `En ${WEB_299_DAYS} días laborables desde que nos das el material. Con una ronda de cambios antes de publicar.`,
  },
] as const;

export const WEB_299_FAQS = [
  {
    q: `¿El precio es ${WEB_299_PRICE} de verdad?`,
    a: `Sí, pago único por el desarrollo. Lo único que se paga aparte, y todos los años, es el alojamiento (${WEB_299_HOSTING}) y el dominio (${WEB_299_DOMAIN}). No hay cuota mensual por la web.`,
  },
  {
    q: "¿Cuántas páginas son?",
    a: "Una sola, de las que se recorren haciendo scroll (one page), con 5 o 6 secciones y un menú que salta a cada una. Es el formato que mejor funciona para un negocio que quiere que le llamen o le escriban; si necesitas varias páginas separadas, te lo presupuestamos aparte.",
  },
  {
    q: "¿Y si ya tengo dominio o alojamiento?",
    a: "Mejor: usamos el que tienes y te ahorras esa parte. Solo pagas los 299€ del desarrollo.",
  },
  {
    q: "¿Quién escribe los textos?",
    a: "Los aportas tú, y te damos una guía de qué contar en cada sección para que no te quedes en blanco. Si prefieres que los escribamos nosotros, lo presupuestamos aparte.",
  },
  {
    q: "¿Qué pasa si no me gusta?",
    a: "Hay una ronda de cambios incluida antes de publicar. Los cambios que van más allá de esa ronda se facturan por horas, y te decimos cuántas antes de tocar nada.",
  },
  {
    q: "¿Es mía?",
    a: "Sí. El dominio va a tu nombre y la web es tuya. Si algún día quieres llevártela a otro sitio, te la llevas.",
  },
] as const;
