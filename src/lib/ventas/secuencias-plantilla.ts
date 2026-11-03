/**
 * Plantillas de secuencia para los sectores de Growth: el punto de partida
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
 * `growth-sectores.ts` y no es el mismo:
 *
 * - **Dental habla de dinero en los cierres.** Lo caro no es llenar la
 *   agenda, es llenarla de pacientes que no acaban haciéndose el tratamiento.
 *   El saludo no vende nada desde el 05-10-2026: responde a la pregunta que
 *   el anuncio deja escrita («¿me contáis cómo hacéis para llenar la agenda de
 *   mi clínica?») y es copia exacta del de `autorespuesta.ts`.
 * - **Psicología habla de huecos.** A una consulta no se le vende «ganar más»
 *   (decisión del 17-09-2026): la sesión tiene un precio que no se estira y un
 *   profesional solo atiende las horas que tiene. Lo que le cambia el mes son
 *   los huecos.
 *
 * Límites del canal que condicionan el copy: 3 botones por mensaje y 20
 * caracteres por botón. Por eso se eligen tres problemas, no cinco.
 *
 * DÓNDE VIVE `avisar`/`fase`: en la ruta de CADA BOTÓN del paso `inicio`, no
 * en el paso de cierre al que lleva. Es contraintuitivo —el aviso «pertenece»
 * al cierre— y es fácil «arreglarlo» al revés, así que queda escrito: mira el
 * orden de `aplicarRuta` en `simulador.ts`. La ruta de un paso solo se aplica
 * cuando el lead contesta TEXTO LIBRE sobre un paso sin botones; al entrar en
 * un paso con `ir_a`, `entrarEnPaso` manda su mensaje y fija `pasoActual`,
 * pero NO aplica la ruta de ese paso destino. Con `avisar` en el cierre, el
 * lead pulsaba, recibía un mensaje que le promete «Le digo a mi compañera que
 * te escriba»… y la conversación se quedaba viva en `bot`, sin aviso, sin
 * nota en la ficha y sin cambio de fase: nadie se enteraba de un lead que
 * acabamos de pagar en Meta.
 *
 * Y por el mismo orden de `aplicarRuta`, la ruta del botón va SIN `terminar`:
 * el `if (ruta.terminar)` sale ANTES del `if (ruta.ir_a)`, así que poner
 * `terminar` en el botón haría que el mensaje de cierre no se enviara nunca.
 * Quien cierra la conversación es `procesar.ts`: ve el aviso, la pasa a
 * `humana` y limpia `paso_actual`.
 *
 * El `{ terminar: true }` que se queda en cada paso `cierre_*` no es
 * alcanzable por WhatsApp: como `procesar.ts` pasa la conversación a `humana`
 * y limpia `paso_actual` en la MISMA vuelta del aviso, ninguna conversación
 * puede quedarse posada en un `cierre_*` esperando otro mensaje del lead.
 * Donde sí se recorre es en el simulador de secuencias del panel, que ejercita
 * el guion paso a paso sin pasar por el orquestador — y ahí marca el final,
 * que es lo que una comercial necesita ver al revisar el guion.
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
        "¡Hola! Soy Paula, de Growth. Claro, te lo cuento 😊\n\n" +
        "Para darte la respuesta que te sirve, dime: ¿cuál es el principal problema que estás teniendo?",
      // `avisar`/`fase` van AQUÍ, en el botón, y SIN `terminar` (ver la
      // cabecera: es el orden de `aplicarRuta` lo que lo obliga).
      botones: [
        { texto: "Faltan pacientes", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_faltan" } },
        { texto: "Primera visita y ya", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_no_arrancan" } },
        { texto: "Vienen y no vuelven", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_no_vuelven" } },
      ],
      guardar_respuesta_en: "problema_principal",
    },

    cierre_faltan: {
      tipo: "mensaje",
      texto:
        "Entendido. Ahí lo primero es saber cuánto te cuesta traer un paciente y cuánto te deja, porque sin eso invertir es apostar.\n\n" +
        "Tenemos una calculadora que lo hace con tus propios números en un minuto: dinkbit.es/growth/dental\n\n" +
        "Le digo a mi compañera que te escriba para verlo contigo.",
      botones: [],
      ruta: { terminar: true },
    },

    cierre_no_arrancan: {
      tipo: "mensaje",
      texto:
        "Ese es el bueno, y es el más caro: pagas por traer a alguien que se queda en la primera visita.\n\n" +
        "Pasa cuando una campaña se mide por citas. Nosotros la medimos por lo que factura cada paciente, así que a los dos meses sabes qué tratamiento te está pagando las campañas y cuál no. Suelen salir menos pacientes y más beneficio.\n\n" +
        "Le digo a mi compañera que te escriba y te lo enseña con tus cifras.",
      botones: [],
      ruta: { terminar: true },
    },

    cierre_no_vuelven: {
      tipo: "mensaje",
      texto:
        "Entonces el problema no está en la entrada, está en el seguimiento: cada paciente que no vuelve es beneficio que ya habías pagado por traer.\n\n" +
        "Eso se ve en el panel mes a mes, con su origen y su ficha, y se corrige. Le digo a mi compañera que te escriba y lo vemos con tu caso.",
      botones: [],
      ruta: { terminar: true },
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
        "¡Hola! Soy Paula, de Growth. Claro, te lo cuento 😊\n\n" +
        "Para darte la respuesta que te sirve, dime: ¿cuál es el principal problema que estás teniendo?",
      // `avisar`/`fase` van AQUÍ, en el botón, y SIN `terminar` (ver la
      // cabecera: es el orden de `aplicarRuta` lo que lo obliga).
      botones: [
        { texto: "Huecos en la agenda", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_huecos" } },
        { texto: "Vienen 1 vez y ya", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_abandono" } },
        { texto: "Solo boca a boca", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_boca_a_boca" } },
      ],
      guardar_respuesta_en: "problema_principal",
    },

    cierre_huecos: {
      tipo: "mensaje",
      texto:
        "Es lo más habitual. Una consulta privada tiene unas 25 sesiones de hueco a la semana y con el boca a boca se queda en torno al 60 % de ocupación.\n\n" +
        "Trabajamos justo eso: traer pacientes nuevos cada mes hasta llenar la agenda. Puedes ver cómo salen los números con los tuyos aquí: dinkbit.es/growth/psicologia\n\n" +
        "Le digo a mi compañera que te escriba para verlo contigo.",
      botones: [],
      ruta: { terminar: true },
    },

    cierre_abandono: {
      tipo: "mensaje",
      texto:
        "Eso cambia mucho la cuenta: si el paciente no sigue, cada hueco vuelve a abrirse al mes siguiente y hay que llenarlo otra vez.\n\n" +
        "Por eso medimos no solo cuántos llegan, sino cuántos se quedan a seguir, y de qué campaña viene cada uno. Le digo a mi compañera que te escriba y lo vemos con tu agenda.",
      botones: [],
      ruta: { terminar: true },
    },

    cierre_boca_a_boca: {
      tipo: "mensaje",
      texto:
        "El boca a boca es la mejor señal de que lo haces bien, pero no lo puedes abrir el día que tienes la agenda floja.\n\n" +
        "La idea es dejarlo donde está y sumarle un canal que sí puedas regular. Le digo a mi compañera que te escriba y te cuenta cómo se empieza sin liarse.",
      botones: [],
      ruta: { terminar: true },
    },
  },
};

/**
 * Chequeo de salud digital, variante A (tono cercano, orden Visibilidad →
 * Captación → Atención → Temperatura). Es la que acompaña al anuncio «Haz un
 * chequeo gratis de la salud digital de tu negocio»: la promesa del anuncio
 * es literalmente lo que recibe al terminar.
 *
 * Las demás variantes del A/B se sacan duplicando esta y cambiando orden y
 * tono, NUNCA las opciones: cada botón guarda su nivel con `guardar_en_lead`
 * en un campo `quiz_*`, y es eso lo que hace comparables las variantes (ver
 * `quiz.ts`).
 *
 * - La bienvenida y la primera pregunta van en el MISMO mensaje: un «Empezar»
 *   antes sería un clic más donde se pierde gente.
 * - El lead se crea al contestar la última pregunta (`crear_lead` en los tres
 *   botones de `p4`): quien abandona a medias no entra en el CRM.
 * - El informe (`{{quiz_informe}}`) se arma con las respuestas al entrar en
 *   `informe_*`, y hay uno por temperatura porque cambia el cierre.
 * - `avisar` va en los botones del cierre y no en los pasos `cierre_*`, por el
 *   orden de `aplicarRuta` (ver la cabecera de este fichero).
 */
export const SECUENCIA_QUIZ_SALUD_A: Secuencia = {
  version: 1,
  inicio: "p1",
  pasos: {
    p1: {
      tipo: "mensaje",
      texto:
        "¡Hola! 👋 Soy Paula García, de Dinkbit. Vamos con tu chequeo de salud digital: son 4 preguntas y al final te mando tu informe con nota.\n\n" +
        "*1/4 · Si alguien busca tu negocio en Google ahora mismo, ¿qué encuentra?*\n\n" +
        "_Tus respuestas solo las usamos para preparar tu informe: dinkbit.es/privacidad_",
      botones: [
        { texto: "Web y ficha Google", guardar_en_lead: { campo: "quiz_visibilidad", valor: "verde" }, ruta: { ir_a: "p2" } },
        { texto: "Solo ficha Google", guardar_en_lead: { campo: "quiz_visibilidad", valor: "amarillo" }, ruta: { ir_a: "p2" } },
        { texto: "Nada o casi nada", guardar_en_lead: { campo: "quiz_visibilidad", valor: "rojo" }, ruta: { ir_a: "p2" } },
      ],
    },
    p2: {
      tipo: "mensaje",
      texto: "Apuntado ✅\n\n*2/4 · ¿Por dónde te llegan la mayoría de clientes?*",
      botones: [
        { texto: "Boca a boca", guardar_en_lead: { campo: "quiz_captacion", valor: "rojo" }, ruta: { ir_a: "p3" } },
        { texto: "Google / mi web", guardar_en_lead: { campo: "quiz_captacion", valor: "verde" }, ruta: { ir_a: "p3" } },
        { texto: "Redes o anuncios", guardar_en_lead: { campo: "quiz_captacion", valor: "amarillo" }, ruta: { ir_a: "p3" } },
      ],
    },
    p3: {
      tipo: "mensaje",
      texto: "*3/4 · Te escribe alguien preguntando precio. ¿Cuándo le contestas normalmente?*",
      botones: [
        { texto: "En minutos", guardar_en_lead: { campo: "quiz_atencion", valor: "verde" }, ruta: { ir_a: "p4" } },
        { texto: "En unas horas", guardar_en_lead: { campo: "quiz_atencion", valor: "amarillo" }, ruta: { ir_a: "p4" } },
        { texto: "Al día siguiente", guardar_en_lead: { campo: "quiz_atencion", valor: "rojo" }, ruta: { ir_a: "p4" } },
      ],
    },
    p4: {
      tipo: "mensaje",
      texto: "Última 🙌\n\n*4/4 · Si el informe te muestra mejoras, ¿cuándo te gustaría ponerte con ello?*",
      botones: [
        { texto: "Ya mismo", guardar_en_lead: { campo: "quiz_temperatura", valor: "ya" }, ruta: { crear_lead: true, ir_a: "informe_ya" } },
        { texto: "En 1-3 meses", guardar_en_lead: { campo: "quiz_temperatura", valor: "pronto" }, ruta: { crear_lead: true, ir_a: "informe_pronto" } },
        { texto: "Solo estoy mirando", guardar_en_lead: { campo: "quiz_temperatura", valor: "mirando" }, ruta: { crear_lead: true, ir_a: "informe_mirando" } },
      ],
    },

    informe_ya: {
      tipo: "mensaje",
      texto: "{{quiz_informe}}\n\n¿Te explico en 10 minutos cómo arreglar lo que está en rojo? Sin compromiso.",
      botones: [
        { texto: "Llamadme hoy", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_hoy" } },
        { texto: "Mejor mañana", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_manana" } },
        { texto: "Prefiero por aquí", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_aqui" } },
      ],
    },
    informe_pronto: {
      tipo: "mensaje",
      texto: "{{quiz_informe}}\n\nCuando quieras te explico cómo arreglarlo, son 10 minutos.",
      botones: [
        { texto: "Sí, llamadme", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_hoy" } },
        { texto: "Prefiero por aquí", ruta: { avisar: true, fase: "interesado", ir_a: "cierre_aqui" } },
        { texto: "Más adelante", ruta: { avisar: true, fase: "volver_a_llamar", ir_a: "cierre_mas_adelante" } },
      ],
    },
    // Sin botones: lo que escriba (el enlace de su web, o «no tengo») es la
    // respuesta, y la ruta propia del paso avisa a Paula con ella.
    informe_mirando: {
      tipo: "mensaje",
      texto:
        "{{quiz_informe}}\n\n¡Perfecto! Si quieres, mándame el enlace de tu web y te digo gratis 3 cosas que mejoraría 👇",
      botones: [],
      guardar_respuesta_en: "web",
      ruta: { avisar: true, ir_a: "cierre_web" },
    },

    cierre_hoy: {
      tipo: "mensaje",
      texto: "¡Hecho! Te llamo hoy. Si te va mejor a una hora concreta, dímela por aquí 😊",
      botones: [],
      ruta: { terminar: true },
    },
    cierre_manana: {
      tipo: "mensaje",
      texto: "¡Perfecto! Te llamo mañana. Si te va mejor a una hora concreta, dímela por aquí 😊",
      botones: [],
      ruta: { terminar: true },
    },
    cierre_aqui: {
      tipo: "mensaje",
      texto: "¡Genial! Cuéntame: ¿qué te gustaría mejorar primero? Te contesto en un rato.",
      botones: [],
      ruta: { terminar: true },
    },
    cierre_mas_adelante: {
      tipo: "mensaje",
      texto: "¡Sin problema! Te escribo más adelante. Si antes te surge cualquier duda, escríbeme por aquí.",
      botones: [],
      ruta: { terminar: true },
    },
    cierre_web: {
      tipo: "mensaje",
      texto: "¡Gracias! Le echo un vistazo y te escribo con las 3 mejoras.",
      botones: [],
      ruta: { terminar: true },
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
  { clave: "quiz-salud-a", nombre: "Chequeo de salud digital (variante A)", secuencia: SECUENCIA_QUIZ_SALUD_A },
];

/**
 * Secuencia con la que arrancar al crear una en el panel. Lo que llega del
 * formulario no es de fiar, así que una clave desconocida no rompe nada: cae
 * al punto de partida de siempre, una secuencia vacía.
 */
export function secuenciaDePlantilla(clave?: string | null): Secuencia {
  return PLANTILLAS.find((p) => p.clave === clave)?.secuencia ?? secuenciaVacia();
}
