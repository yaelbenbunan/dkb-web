import { CONTACT_INFO } from "./contact-info";

/**
 * Configuración de la landing de captación del sistema para clínicas.
 *
 * El nombre comercial vive aquí y NINGÚN componente lo escribe literal: si
 * cambia, se cambia en este fichero. Lo mismo con la ruta — y esa además
 * necesita un redirect 301 en next.config.ts desde la vieja.
 *
 * **Growth vende solo captación con campañas** —landing, Google y Meta,
 * análisis—, sin CRM ni agenda (25 de septiembre de 2026).
 */
export const GROWTH = {
  /** Nombre comercial. */
  name: "Growth",
  /** Ruta de la landing. */
  path: "/growth",
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
  /**
   * El mismo calendario, pero para meterlo DENTRO de la página.
   *
   * **Es una URL distinta y no un capricho.** La corta —`calendar.app.google/…`,
   * la que se comparte— responde `x-frame-options: SAMEORIGIN`, así que en un
   * iframe sale en blanco. La de inserción lleva `/calendar/` delante y
   * `?gv=true` detrás, y esa Google sí la deja embeber: comprobado contra las
   * cabeceras y cargándola de verdad en la landing.
   *
   * Va entera y no construida a partir de la corta: resolver el redirect en
   * cada carga sería una petición de más para un valor que no cambia.
   *
   * Si algún día se rehace el calendario en Google, este identificador cambia y
   * hay que traerlo de nuevo desde «Insertar» en los ajustes de la página de
   * citas. La corta de `contact-info` cambiaría también.
   */
  demoEmbedUrl:
    "https://calendar.google.com/calendar/appointments/schedules/AcZssZ01ovJTQGUCydYIWqt6uUqM12sfFGj0-hBEjC3Pe5ZhH88hVap-IUW2SaJ3KjBFnWFYjpDScvzl?gv=true" as
      | string
      | null,
} as const;

/**
 * Paleta de Growth: oscura, en azul petróleo, con un solo acento turquesa.
 *
 * El fondo es un negro verdoso, las superficies secundarias van en azul
 * petróleo y el acento es turquesa (26 de septiembre de 2026).
 *
 * Encima del turquesa relleno se escribe en `onAccent` (el fondo), nunca en
 * blanco: blanco sobre #30CCCE no se lee.
 *
 * Los colores van en línea y no con los tokens del tema del sitio, que cambian
 * con el interruptor claro/oscuro de dinkbit: esa dependencia ya dejó una vez la
 * calculadora ilegible.
 */
export const GROWTH_THEME = {
  /** Fondo principal: negro verdoso. */
  bg: "#071A1D",
  /** El secundario: azul petróleo, para secciones alternas y tarjetas. */
  soft: "#0F2B30",
  /** Un petróleo algo más claro, para la banda y la tarjeta del formulario. */
  dark: "#0B3238",
  /** Texto principal. */
  fg: "#EAF4F4",
  /** Texto secundario. */
  muted: "#94B0B4",
  /** Bordes y separadores. */
  line: "#1F454C",
  /** El acento, para rellenos: botones, iconos, marcas. */
  accent: "#30CCCE",
  /** El acento para escribir: sobre estos fondos el mismo turquesa se lee bien. */
  accentText: "#30CCCE",
  /** Texto encima del acento relleno. */
  onAccent: "#071A1D",
  /** Texto sobre la banda y el formulario. */
  onDark: "#FFFFFF",
  /** Texto secundario sobre la banda y el formulario. */
  onDarkMuted: "#A3C1C5",
} as const;
