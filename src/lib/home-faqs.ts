/**
 * Preguntas frecuentes de la portada.
 *
 * Existen por GEO tanto como por el visitante: un buscador con IA cita antes un
 * párrafo que responde una pregunta entera que tres frases de marketing sin
 * datos. Estas son las preguntas que de verdad le hacen a una IA sobre una
 * agencia —quién eres, dónde estás, cuánto cobras, con quién trabajas— y las
 * respuestas llevan datos concretos a propósito: un año, una ciudad, una cifra.
 * Una respuesta sin números no es citable, es publicidad.
 *
 * Fuente ÚNICA para el texto visible y para el `FAQPage` de datos
 * estructurados. Tenerlos en dos sitios acabaría con una IA citando una versión
 * que ya no es la que lee un cliente.
 */
export interface HomeFaq {
  q: string;
  a: string;
}

export const HOME_FAQS: readonly HomeFaq[] = [
  {
    q: "¿Qué hace dinkbit?",
    a: "Somos una agencia de marketing digital: diseñamos y desarrollamos páginas web y tiendas online, y llevamos la captación de clientes con campañas de pago, SEO, email y redes. Trabajamos sobre todo con pymes y negocios locales que necesitan que les encuentren y les llamen.",
  },
  {
    q: "¿Dónde estáis?",
    a: "Nuestra oficina está en San Sebastián de los Reyes, Madrid. Trabajamos con clientes de toda España y también en México, casi siempre en remoto, con reuniones presenciales cuando hacen falta.",
  },
  {
    q: "¿Desde cuándo trabajáis?",
    a: "Desde 2010. En la web hay publicados más de veinticinco casos de éxito con el trabajo hecho y su resultado, de clínicas dentales a hoteles, clubes deportivos y empresas de reformas.",
  },
  {
    q: "¿Cuánto cuesta una página web con vosotros?",
    a: "Una web de una sola página cuesta 299€ de pago único, sin cuota mensual. El alojamiento son 100€ al año y el dominio 25€, así que el primer año son 424€ y a partir del segundo 125€ al año. Una web de varias páginas o una tienda online se presupuestan aparte.",
  },
  {
    q: "¿Trabajáis con negocios pequeños?",
    a: "Sí, es la mayor parte de lo que hacemos. Buena parte de nuestros clientes son consultas, clínicas, tiendas y negocios locales de una o pocas personas. No hay un tamaño mínimo ni una permanencia obligatoria.",
  },
  {
    q: "¿Hace falta firmar una permanencia?",
    a: "No para el desarrollo web, que es un pago único y la web es tuya. En los servicios recurrentes, como las campañas de pago, trabajamos por meses y se puede parar avisando: preferimos que sigas porque funciona y no porque no puedas salir.",
  },
];
