/**
 * Plantillas de secuencia para los sectores de `escala`: el punto de partida
 * al crear una conversación de WhatsApp para dental o para psicología.
 *
 * No son código de producto: son CONTENIDO tipado. Se cargan en el editor del
 * panel y desde ahí se editan por marca, que es donde deben acabar de
 * afinarse. Viven aquí, y no en la base, para que los tests puedan comprobar
 * que siguen siendo válidas: una secuencia rota no se descubre al guardarla,
 * se descubre cuando un lead real se queda a medias.
 *
 * El paso `inicio` de cada una es, palabra por palabra, el texto que hoy
 * manda `whatsapp/autorespuesta.ts` para ese sector (`CUERPO`/`OPCIONES`):
 * saluda, dice a qué viene en una frase y pregunta el problema con tres
 * botones. Antes había dos mensajes de presentación —uno con espera de
 * 7 días— antes de llegar a la pregunta; se han eliminado porque cada
 * mensaje antes de cualificar es uno en el que el lead puede abandonar, y
 * ahora es la secuencia, no `autorespuesta.ts`, la que manda el primer
 * mensaje real (ese fichero se queda como respaldo, ver su cabecera).
 *
 * Las dos comparten esqueleto —inicio con la pregunta, tres cierres— y
 * cambia el argumento, porque el argumento de cada sector ya está decidido en
 * `escala-sectores.ts` y no es el mismo:
 *
 * - **Dental habla de dinero.** «La mitad de pacientes, el doble de
 *   beneficio»: lo caro no es llenar la agenda, es llenarla de pacientes que
 *   no acaban haciéndose el tratamiento.
 * - **Psicología habla de huecos.** A una consulta no se le vende «ganar más»
 *   (decisión del 17-09-2026): la sesión tiene un precio que no se estira y un
 *   profesional solo atiende las horas que tiene. Lo que le cambia el mes son
 *   los huecos.
 *
 * Límites del canal que condicionan el copy: 3 botones por mensaje y 20
 * caracteres por botón. Por eso se eligen tres problemas, no cinco.
 *
 * NINGÚN PASO ES PLANTILLA, y es deliberado: la conversación la arranca el
 * lead pulsando un anuncio Click-to-WhatsApp, o sea que es él quien abre la
 * ventana. Nuestro primer mensaje es una respuesta y va en texto libre, sin
 * pasar por la aprobación de Meta. Si algún día estas secuencias se lanzan en
 * frío desde el tablero, el primer paso sí tendría que marcarse como
 * plantilla.
 */

import { secuenciaVacia, type Secuencia } from "./secuencias";

export const SECUENCIA_DENTAL: Secuencia = {
  version: 1,
  inicio: "inicio",
  pasos: {
    inicio: {
      tipo: "mensaje",
      texto:
        "¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para que ganes más con cada paciente.\n\n" +
        "Para poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?",
      botones: [
        { texto: "Faltan pacientes", ruta: { ir_a: "cierre_faltan" } },
        { texto: "Primera visita y ya", ruta: { ir_a: "cierre_no_arrancan" } },
        { texto: "Vienen y no vuelven", ruta: { ir_a: "cierre_no_vuelven" } },
      ],
      guardar_respuesta_en: "problema_principal",
    },

    cierre_faltan: {
      tipo: "mensaje",
      texto:
        "Entendido. Ahí lo primero es saber cuánto te cuesta traer un paciente y cuánto te deja, porque sin eso invertir es apostar.\n\n" +
        "Tenemos una calculadora que lo hace con tus propios números en un minuto: dinkbit.es/escala/dental\n\n" +
        "Le digo a mi compañera que te escriba para verlo contigo.",
      botones: [],
      ruta: { avisar: true, fase: "interesado", terminar: true },
    },

    cierre_no_arrancan: {
      tipo: "mensaje",
      texto:
        "Ese es el bueno, y es el más caro: pagas por traer a alguien que se queda en la primera visita.\n\n" +
        "Pasa cuando una campaña se mide por citas. Nosotros la medimos por lo que factura cada paciente, así que a los dos meses sabes qué tratamiento te está pagando las campañas y cuál no. Suelen salir menos pacientes y más beneficio.\n\n" +
        "Le digo a mi compañera que te escriba y te lo enseña con tus cifras.",
      botones: [],
      ruta: { avisar: true, fase: "interesado", terminar: true },
    },

    cierre_no_vuelven: {
      tipo: "mensaje",
      texto:
        "Entonces el problema no está en la entrada, está en el seguimiento: cada paciente que no vuelve es beneficio que ya habías pagado por traer.\n\n" +
        "Eso se ve en el panel mes a mes, con su origen y su ficha, y se corrige. Le digo a mi compañera que te escriba y lo vemos con tu caso.",
      botones: [],
      ruta: { avisar: true, fase: "interesado", terminar: true },
    },
  },
};

export const SECUENCIA_PSICOLOGIA: Secuencia = {
  version: 1,
  inicio: "inicio",
  pasos: {
    inicio: {
      tipo: "mensaje",
      texto:
        "¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.\n\n" +
        "Para poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?",
      botones: [
        { texto: "Huecos en la agenda", ruta: { ir_a: "cierre_huecos" } },
        { texto: "Vienen 1 vez y ya", ruta: { ir_a: "cierre_abandono" } },
        { texto: "Solo boca a boca", ruta: { ir_a: "cierre_boca_a_boca" } },
      ],
      guardar_respuesta_en: "problema_principal",
    },

    cierre_huecos: {
      tipo: "mensaje",
      texto:
        "Es lo más habitual. Una consulta privada tiene unas 25 sesiones de hueco a la semana y con el boca a boca se queda en torno al 60 % de ocupación.\n\n" +
        "Trabajamos justo eso: traer pacientes nuevos cada mes hasta llenar la agenda. Puedes ver cómo salen los números con los tuyos aquí: dinkbit.es/escala/psicologia\n\n" +
        "Le digo a mi compañera que te escriba para verlo contigo.",
      botones: [],
      ruta: { avisar: true, fase: "interesado", terminar: true },
    },

    cierre_abandono: {
      tipo: "mensaje",
      texto:
        "Eso cambia mucho la cuenta: si el paciente no sigue, cada hueco vuelve a abrirse al mes siguiente y hay que llenarlo otra vez.\n\n" +
        "Por eso medimos no solo cuántos llegan, sino cuántos se quedan a seguir, y de qué campaña viene cada uno. Le digo a mi compañera que te escriba y lo vemos con tu agenda.",
      botones: [],
      ruta: { avisar: true, fase: "interesado", terminar: true },
    },

    cierre_boca_a_boca: {
      tipo: "mensaje",
      texto:
        "El boca a boca es la mejor señal de que lo haces bien, pero no lo puedes abrir el día que tienes la agenda floja.\n\n" +
        "La idea es dejarlo donde está y sumarle un canal que sí puedas regular. Le digo a mi compañera que te escriba y te cuenta cómo se empieza sin liarse.",
      botones: [],
      ruta: { avisar: true, fase: "interesado", terminar: true },
    },
  },
};

export interface Plantilla {
  clave: string;
  nombre: string;
  secuencia: Secuencia;
}

/** Lo que ofrece el selector al crear una secuencia en el panel. */
export const PLANTILLAS: Plantilla[] = [
  { clave: "dental", nombre: "Captación clínicas dentales", secuencia: SECUENCIA_DENTAL },
  { clave: "psicologia", nombre: "Captación consultas de psicología", secuencia: SECUENCIA_PSICOLOGIA },
];

/**
 * Secuencia con la que arrancar al crear una en el panel. Lo que llega del
 * formulario no es de fiar, así que una clave desconocida no rompe nada: cae
 * al punto de partida de siempre, una secuencia vacía.
 */
export function secuenciaDePlantilla(clave?: string | null): Secuencia {
  return PLANTILLAS.find((p) => p.clave === clave)?.secuencia ?? secuenciaVacia();
}
