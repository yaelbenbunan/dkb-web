import { CONTACT_INFO } from "./contact-info";

/**
 * Configuración de la landing de captación del sistema para clínicas.
 *
 * El nombre comercial vive aquí y NINGÚN componente lo escribe literal: si
 * cambia, se cambia en este fichero. Lo mismo con la ruta — y esa además
 * necesita un redirect 301 en next.config.ts, como el que ya hay de /escala,
 * que se queda para siempre.
 *
 * **Vuelve a llamarse Growth desde el 25 de septiembre de 2026**, en
 * dinkbit.es/growth, y con eso cambia también lo que vende: solo captación
 * con campañas —landing, Google y Meta, análisis—, sin CRM ni agenda. La
 * versión de Escala tal y como estaba queda en la etiqueta
 * `respaldo/landing-escala-2026-09-25`.
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
 * Paleta de Growth: clara, limpia y con un solo acento turquesa.
 *
 * **No se parece a la de Escala a propósito** (25 de septiembre de 2026). Escala
 * era casi negra con acento lima, tipografía en negrita máxima, trazos a mano y
 * texturas; Growth es otro negocio y no puede leerse como su hermana. Por eso
 * aquí todo va al revés: fondo blanco, texto en un azul petróleo muy oscuro,
 * tarjetas con borde fino y nada dibujado a mano. La versión de Escala está en
 * la etiqueta `respaldo/landing-escala-2026-09-25`.
 *
 * **El turquesa tiene dos tonos, y no es un capricho.** #30CCCE sobre blanco da
 * 2:1 de contraste: vale para rellenar un botón o un icono, no para escribir.
 * Para texto de acento está `accentText`, que es el mismo tono oscurecido hasta
 * pasar 4,5:1. Encima del turquesa relleno se escribe en `onAccent` (el azul
 * oscuro), nunca en blanco.
 *
 * Los colores van en línea y no con los tokens del tema del sitio, que cambian
 * con el interruptor claro/oscuro de dinkbit: esa dependencia ya dejó una vez la
 * calculadora ilegible.
 */
export const GROWTH_THEME = {
  /** Fondo principal. */
  bg: "#FFFFFF",
  /** Fondo de las secciones alternas: blanco apenas teñido de turquesa. */
  soft: "#F2F8F8",
  /** El oscuro de la marca: texto principal, banda oscura y tarjeta del formulario. */
  dark: "#0F2B30",
  /** Texto principal. */
  fg: "#0F2B30",
  /** Texto secundario. */
  muted: "#587075",
  /** Bordes y separadores. */
  line: "#DDE9EA",
  /** El acento, para rellenos: botones, iconos, marcas. */
  accent: "#30CCCE",
  /** El acento para escribir sobre claro. */
  accentText: "#0A7C7E",
  /** Texto encima del acento relleno. */
  onAccent: "#0F2B30",
  /** Texto sobre el oscuro. */
  onDark: "#FFFFFF",
  /** Texto secundario sobre el oscuro. */
  onDarkMuted: "#A3C1C5",
} as const;
