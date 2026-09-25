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
 * Paleta propia del producto, deliberadamente ajena a la del resto de dinkbit.
 *
 * Existe por dos razones:
 *
 * 1. Diferenciación. Esta landing compite contra cientos de agencias que
 *    prometen "llenarte la agenda", y el sector entero es azul clarito. Un
 *    fondo casi negro con un turquesa encendido rompe con eso de un vistazo.
 *    Fue lima (#C7F73E) mientras la landing se llamó Escala; con Growth pasa
 *    a #30CCCE.
 *
 * 2. Inmunidad al tema. Los tokens del sitio (`text-fg`, `surface-elevated`…)
 *    cambian con el interruptor claro/oscuro, y esa dependencia ya provocó que
 *    la calculadora quedara ilegible: texto casi blanco sobre un panel que es
 *    claro en LOS DOS temas. Aquí los colores son explícitos y no dependen de
 *    nada externo, así que ese fallo no puede repetirse.
 *
 * **Hay UN acento y solo uno.** Hubo dos —el acento para lo que se gana, rojo
 * y luego ámbar para el problema— y era peor: con dos colores el lector tiene
 * que ir aprendiendo qué significa cada uno mientras lee, y el rojo además
 * sonaba a reproche justo donde el dueño de la clínica tiene que reconocerse
 * sin ponerse a la defensiva.
 *
 * Con un solo acento, el color quiere decir siempre lo mismo: esto importa.
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
  /** El único acento: lo que importa. */
  accent: "#30CCCE",
  /** Texto principal. */
  fg: "#F5F7F8",
  /** Texto secundario. */
  muted: "#8E949F",
} as const;
