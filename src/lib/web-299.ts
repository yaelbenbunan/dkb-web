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

/**
 * El coste REAL, sumado. Es el número que todo el mundo calcula a mano y que
 * ninguna landing de la competencia pone: 299 de la web más 100 de alojamiento
 * más 25 de dominio son 424€ el primer año, y 125€ los siguientes. Decirlo
 * nosotros quita la sensación de que hay algo escondido, y de paso el segundo
 * número (125€/año) es el argumento de verdad frente a una cuota mensual.
 *
 * Se calculan aquí, de los mismos literales de arriba, para que no puedan
 * desincronizarse si cambia un precio.
 */
const euros = (texto: string) => Number(texto.replace("€", ""));
export const WEB_299_TOTAL_PRIMER_ANO = `${euros(WEB_299_PRICE) + euros(WEB_299_HOSTING) + euros(WEB_299_DOMAIN)}€`;
export const WEB_299_TOTAL_SIGUIENTES = `${euros(WEB_299_HOSTING) + euros(WEB_299_DOMAIN)}€`;

/**
 * Las secciones de la one page, en el orden en que se recorren.
 *
 * Son la pieza central de la página: en vez de enumerar «qué incluye» en una
 * lista, se enseña la página montándose sección a sección. El producto ES esto,
 * así que mostrarlo explica mejor que describirlo — y responde de paso a
 * «¿cuántas páginas son?» sin que nadie tenga que preguntarlo.
 */
export const WEB_299_SECCIONES = [
  { n: "01", titulo: "Portada", que: "Quién eres y qué haces, en una frase que se entiende. Con el botón de contacto a la vista." },
  { n: "02", titulo: "Servicios", que: "Lo que ofreces, ordenado y sin jerga. Lo que la gente viene a comprobar." },
  { n: "03", titulo: "Cómo trabajas", que: "El proceso en tres o cuatro pasos. Es lo que quita el miedo a dar el paso." },
  { n: "04", titulo: "Precios", que: "Si los enseñas, filtras. Y si no quieres enseñarlos, ponemos un rango." },
  { n: "05", titulo: "Dónde estás", que: "Mapa, horario y cómo llegar. Lo primero que busca quien ya está decidido." },
  { n: "06", titulo: "Contacto", que: "Formulario que te llega al correo, y botón de WhatsApp y de llamada." },
] as const;

/**
 * Lo que se entrega ADEMÁS de las seis secciones (esas van en
 * `WEB_299_SECCIONES`). Se separan a propósito: las secciones son la forma del
 * producto y esto son las piezas que la hacen funcionar, y mezclarlas en una
 * sola lista era lo que hacía que ninguna de las dos se leyera.
 */
export const WEB_299_INCLUDES = [
  "Se ve bien en móvil, tablet y ordenador.",
  "Formulario de contacto que te llega a tu correo.",
  "Botón de WhatsApp y de llamada, para que te escriban en un toque.",
  "Aviso legal, política de privacidad y cookies.",
  "Una ronda de cambios incluida antes de publicar.",
] as const;

export const WEB_299_EXCLUDES = [
  `Alojamiento (${WEB_299_HOSTING}/año) y dominio (${WEB_299_DOMAIN}/año).`,
  "Tienda online o pasarela de pago.",
  "Reserva de cita online (te lo presupuestamos aparte).",
  "Blog o publicación de artículos.",
  "Redacción de textos y sesión de fotos: los aportas tú.",
  "Diseño de logotipo.",
] as const;

/**
 * Los pasos llevan CUÁNDO, no solo qué. «Cómo funciona» es la pregunta que se
 * hace la agencia; la que se hace el cliente es «cuándo la tengo», y el plazo
 * es además un argumento de venta que estaba enterrado en un párrafo.
 *
 * Ojo con el último: los días laborables cuentan desde que llega el material,
 * no desde el formulario, y así está dicho en su descripción. Prometer «tu web
 * en 5 días» sin esa condición es la promesa que se incumple sola en cuanto el
 * cliente tarda una semana en mandar las fotos.
 */
export const WEB_299_STEPS = [
  {
    dia: "Hoy",
    title: "Nos dejas tus datos",
    description:
      "Nombre, teléfono y correo. Nada más. Te llamamos o te escribimos por WhatsApp, como prefieras.",
  },
  {
    dia: "Día 1",
    title: "Nos cuentas tu negocio",
    description:
      "Una conversación de veinte minutos y un cuestionario corto. Con eso elegimos la estructura y la adaptamos a lo que vendes.",
  },
  {
    dia: `+${WEB_299_DAYS} días`,
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
