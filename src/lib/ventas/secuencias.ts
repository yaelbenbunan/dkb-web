/**
 * Forma y validación de una secuencia de WhatsApp (fase 1, sin envío real).
 * Módulo puro (sin `server-only`): lo usan el editor, el simulador y el
 * servidor. Los pasos se guardan en jsonb y SIEMPRE se validan con zod al
 * escribir y al leer: una secuencia guardada con una forma inválida no debe
 * romper la pantalla, se enseña el error (`parsearSecuencia`).
 *
 * `parsearSecuencia` solo comprueba la forma (textos, límites de WhatsApp,
 * ids de paso). Las reglas de negocio —que el inicio exista, que las rutas
 * lleven a algún sitio, que las variables estén permitidas…— las comprueba
 * `validarSecuencia`, que no rechaza nada: da avisos, graves o no, para que
 * el editor los enseñe y la activación los bloquee cuando toque.
 *
 * Spec: docs/superpowers/specs/2026-09-18-secuencias-whatsapp-design.md
 */

import { z } from "zod";
import { esFaseDescarte, FASES, type Fase } from "./dominio";

/** Variables siempre disponibles; cada marca puede añadir las suyas. */
export const VARIABLES_BASE = ["negocio", "contacto", "ciudad", "marca", "remitente"] as const;

const ID_PASO_RE = /^[a-z0-9_-]{1,24}$/;
const VARIABLE_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Qué ocurre tras un botón (o tras un paso sin botones): ir a otro paso,
 *  cambiar de fase, esperar unos días, avisar a la comercial o terminar. */
export interface Ruta {
  ir_a?: string;
  fase?: Fase;
  esperar_dias?: number;
  avisar?: boolean;
  terminar?: boolean;
}

export interface Boton {
  texto: string;
  ruta: Ruta;
}

export interface Paso {
  tipo: "mensaje";
  texto: string;
  /** Solo el paso de inicio puede serlo: hace falta plantilla aprobada por Meta. */
  plantilla?: boolean;
  botones: Boton[];
  guardar_respuesta_en?: string;
  /** Ruta de un paso sin botones (si no, la conversación se queda parada). */
  ruta?: Ruta;
}

export interface Secuencia {
  version: 1;
  inicio: string;
  pasos: Record<string, Paso>;
}

const rutaSchema: z.ZodType<Ruta> = z.object({
  ir_a: z.string().min(1, "El destino de la ruta no puede estar vacío.").optional(),
  fase: z.enum(FASES, { message: "Fase no válida." }).optional(),
  esperar_dias: z.number("Los días de espera no son un número válido.").optional(),
  avisar: z.boolean().optional(),
  terminar: z.boolean().optional(),
});

const botonSchema: z.ZodType<Boton> = z.object({
  texto: z
    .string()
    .min(1, "El texto del botón no puede estar vacío.")
    .max(20, "El texto del botón no puede pasar de 20 caracteres: es lo que admite WhatsApp."),
  ruta: rutaSchema,
});

const pasoSchema: z.ZodType<Paso> = z.object({
  tipo: z.literal("mensaje", { message: "El tipo de paso tiene que ser «mensaje»." }),
  texto: z
    .string()
    .min(1, "El texto del paso no puede estar vacío.")
    .max(1024, "El texto del paso no puede pasar de 1024 caracteres."),
  plantilla: z.boolean().optional(),
  botones: z.array(botonSchema).max(3, "Un paso admite como mucho 3 botones."),
  guardar_respuesta_en: z.string().min(1).optional(),
  ruta: rutaSchema.optional(),
});

export const secuenciaSchema: z.ZodType<Secuencia> = z.object({
  version: z.literal(1, { message: "Versión de secuencia no soportada." }),
  inicio: z.string().min(1, "Falta el paso de inicio."),
  pasos: z.record(
    z.string().regex(ID_PASO_RE, "El id de un paso solo admite minúsculas, números, «_» y «-» (máximo 24)."),
    pasoSchema,
  ),
});

export function parsearSecuencia(raw: unknown): { ok: true; secuencia: Secuencia } | { ok: false; error: string } {
  const r = secuenciaSchema.safeParse(raw);
  if (r.success) return { ok: true, secuencia: r.data };
  return { ok: false, error: r.error.issues[0]?.message ?? "La secuencia no tiene una forma válida." };
}

/** Punto de partida al crear una secuencia: un paso de plantilla con un botón. */
export function secuenciaVacia(): Secuencia {
  return {
    version: 1,
    inicio: "p1",
    pasos: {
      p1: {
        tipo: "mensaje",
        plantilla: true,
        texto: "Hola {{contacto}}, soy {{remitente}} de {{marca}}. ¿Tienes un minuto?",
        botones: [{ texto: "Sí, cuéntame", ruta: { terminar: true } }],
      },
    },
  };
}

/** Nombres de variable usados en un texto (`{{negocio}}` → `"negocio"`), sin repetir. */
export function variablesEnTexto(texto: string): string[] {
  const encontradas: string[] = [];
  for (const coincidencia of texto.matchAll(VARIABLE_RE)) {
    const nombre = coincidencia[1];
    if (!encontradas.includes(nombre)) encontradas.push(nombre);
  }
  return encontradas;
}

/** Sustituye las variables con valor; las que faltan se dejan tal cual (para
 *  ver el hueco) y se listan en `faltan`. */
export function renderizarTexto(
  texto: string,
  valores: Record<string, string | null>,
): { texto: string; faltan: string[] } {
  const faltan: string[] = [];
  const resultado = texto.replace(VARIABLE_RE, (coincidencia, nombre: string) => {
    const valor = valores[nombre];
    if (valor === undefined || valor === null) {
      if (!faltan.includes(nombre)) faltan.push(nombre);
      return coincidencia;
    }
    return valor;
  });
  return { texto: resultado, faltan };
}

/** Destinos (`ir_a`) de los botones de un paso y de su ruta propia, sin repetir. */
export function siguientesPasos(s: Secuencia, id: string): string[] {
  const paso = s.pasos[id];
  if (!paso) return [];
  const destinos: string[] = [];
  const rutas: Ruta[] = [...paso.botones.map((b) => b.ruta), ...(paso.ruta ? [paso.ruta] : [])];
  for (const ruta of rutas) {
    if (ruta.ir_a && !destinos.includes(ruta.ir_a)) destinos.push(ruta.ir_a);
  }
  return destinos;
}

export interface Aviso {
  paso: string;
  mensaje: string;
  grave: boolean;
}

function rutasDelPaso(paso: Paso): Ruta[] {
  return [...paso.botones.map((b) => b.ruta), ...(paso.ruta ? [paso.ruta] : [])];
}

/**
 * Comprueba las reglas de negocio de una secuencia ya parseada. No rechaza
 * nada: devuelve avisos (graves o no) para que el editor los enseñe. Las
 * graves impiden activar la secuencia (`activarSecuencia`, fase 4).
 */
export function validarSecuencia(s: Secuencia, variablesExtra: string[] = []): Aviso[] {
  const avisos: Aviso[] = [];
  const variablesValidas = new Set<string>([...VARIABLES_BASE, ...variablesExtra]);
  const idsPasos = new Set(Object.keys(s.pasos));

  // 1. El inicio existe entre los pasos.
  if (!idsPasos.has(s.inicio)) {
    avisos.push({ paso: s.inicio, mensaje: `El paso de inicio «${s.inicio}» no existe.`, grave: true });
  }

  for (const [id, paso] of Object.entries(s.pasos)) {
    // 2. Todo ir_a apunta a un paso existente. 9. terminar no lleva ir_a.
    // 8. esperar_dias entre 1 y 90.
    for (const ruta of rutasDelPaso(paso)) {
      if (ruta.ir_a && !idsPasos.has(ruta.ir_a)) {
        avisos.push({ paso: id, mensaje: `El destino «${ruta.ir_a}» no existe.`, grave: true });
      }
      if (ruta.terminar && ruta.ir_a) {
        avisos.push({
          paso: id,
          mensaje: "Una ruta que termina la conversación no puede llevar también a otro paso.",
          grave: true,
        });
      }
      if (ruta.esperar_dias !== undefined && (ruta.esperar_dias < 1 || ruta.esperar_dias > 90)) {
        avisos.push({ paso: id, mensaje: "La espera tiene que ser de entre 1 y 90 días.", grave: true });
      }
    }

    // 4. Un paso sin botones necesita ruta: si no, la conversación se queda parada.
    if (paso.botones.length === 0 && !paso.ruta) {
      avisos.push({
        paso: id,
        mensaje: "Este paso no tiene botones ni ruta: la conversación se quedaría parada.",
        grave: true,
      });
    }

    // 5. Ningún botón repite texto dentro del mismo paso.
    const textosVistos = new Set<string>();
    for (const boton of paso.botones) {
      if (textosVistos.has(boton.texto)) {
        avisos.push({ paso: id, mensaje: `Hay más de un botón con el texto «${boton.texto}».`, grave: false });
      }
      textosVistos.add(boton.texto);
    }

    // 6. Las variables usadas están en VARIABLES_BASE o en variablesExtra.
    for (const variable of variablesEnTexto(paso.texto)) {
      if (!variablesValidas.has(variable)) {
        avisos.push({ paso: id, mensaje: `La variable «{{${variable}}}» no existe.`, grave: true });
      }
    }

    // 7. Solo el paso de inicio puede ser plantilla.
    if (paso.plantilla && id !== s.inicio) {
      avisos.push({
        paso: id,
        mensaje: "Solo el primer paso puede ser una plantilla: el resto va dentro de la ventana de 24 horas.",
        grave: false,
      });
    }
  }

  // 3. Todo paso es alcanzable desde el inicio.
  if (idsPasos.has(s.inicio)) {
    const alcanzables = new Set<string>([s.inicio]);
    const pendientes = [s.inicio];
    while (pendientes.length > 0) {
      const actual = pendientes.pop() as string;
      for (const destino of siguientesPasos(s, actual)) {
        if (idsPasos.has(destino) && !alcanzables.has(destino)) {
          alcanzables.add(destino);
          pendientes.push(destino);
        }
      }
    }
    for (const id of idsPasos) {
      if (!alcanzables.has(id)) {
        avisos.push({ paso: id, mensaje: "No hay ningún camino desde el inicio hasta este paso.", grave: false });
      }
    }
  }

  // 10. Ningún camino acaba sin avisar a la comercial.
  //
  // Existe por un fallo real y caro de esta entrega: las dos secuencias de
  // captación llevaban el `avisar` en la ruta del PASO de cierre, y el motor no
  // aplica la ruta del paso al que entra con `ir_a` (ver `aplicarRuta` en
  // `simulador.ts`). El lead pulsaba su problema, recibía el cierre que le
  // promete «Le digo a mi compañera que te escriba», y la conversación se
  // quedaba viva en `bot` sin aviso, sin nota y sin cambio de fase: un lead
  // pagado en Meta del que nadie se enteraba. Lo mismo pasa si alguien
  // desmarca la casilla «avisar» de un botón desde el editor del panel, y esa
  // fila de Supabase es la que corre de verdad — los tests del repo miran las
  // constantes del código, no la secuencia editada.
  //
  // Solo se aplica si la secuencia avisa en ALGÚN camino. Un guion que no
  // promete ninguna llamada es legítimo (informa y se despide); lo que no es
  // legítimo es que avise en dos caminos y en el tercero no, porque entonces la
  // propia secuencia demuestra que pretende un traspaso a una persona.
  //
  // Y un camino que deja el lead en una fase de DESCARTE tampoco se marca: un
  // botón de salida («No me llaméis») es precisamente el tercer camino que
  // legítimamente no quiere llamada, y el descarte queda registrado en el CRM.
  // Sin esta excepción la regla apagaba campañas vivas: `guardarSecuencia` no
  // solo bloquea la activación, baja a `borrador` una secuencia que estaba
  // `activa` devolviendo `{ ok: true }`, así que añadir ese botón desde el panel
  // dejaba a todos los leads del anuncio cayendo al respaldo genérico sin que
  // nada lo dijera.
  //
  // Esta regla ACONSEJA; lo que GARANTIZA que el bot no cierre una conversación
  // en silencio es `procesar.ts`, que entrega a una persona cualquier
  // transición que no produzca mensaje, ni aviso, ni descarte. Por eso aquí se
  // puede ser prudente con los falsos positivos: la red de seguridad está en el
  // motor, no en el validador.
  const avisaEnAlgunCamino = Object.values(s.pasos).some((paso) =>
    rutasDelPaso(paso).some((ruta) => ruta.avisar),
  );
  if (avisaEnAlgunCamino && idsPasos.has(s.inicio)) {
    // Las rutas que el motor puede TOMAR desde un paso. Un paso con botones no
    // aplica nunca su propia `ruta`: `responderTexto` trata el texto libre
    // sobre un paso con botones como salirse del guion, y eso ya levanta su
    // aviso. Un paso sin botones sí aplica la suya.
    const rutasTomables = (paso: Paso): Ruta[] =>
      paso.botones.length > 0 ? paso.botones.map((b) => b.ruta) : paso.ruta ? [paso.ruta] : [];

    // Un `paso` puede recorrerse con el aviso ya levantado o sin él, y el
    // resultado es distinto, así que el visitado lleva las dos cosas. Sin eso,
    // un ciclo entre pasos colgaría la validación.
    const sinRecoger = new Set<string>();
    const vistos = new Set<string>();
    const pendientes: Array<{ id: string; avisado: boolean }> = [{ id: s.inicio, avisado: false }];
    while (pendientes.length > 0) {
      const { id, avisado } = pendientes.pop() as { id: string; avisado: boolean };
      const clave = `${id}:${avisado}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      const paso = s.pasos[id];
      if (!paso) continue;
      for (const ruta of rutasTomables(paso)) {
        const yaAvisado = avisado || !!ruta.avisar;
        // Un cierre con fase de descarte está recogido: el lead dijo que no y
        // queda registrado. No hace falta que además avise a nadie.
        const recogido = yaAvisado || esFaseDescarte(ruta.fase);
        // El mismo orden que `aplicarRuta`, que es lo que de verdad decide a
        // dónde va el guion: `terminar` gana a `esperar_dias`, y este a `ir_a`.
        if (ruta.terminar) {
          if (!recogido) sinRecoger.add(id);
          continue;
        }
        if (ruta.esperar_dias !== undefined) {
          // Una espera no deja al lead sin recoger: `procesar.ts` persiste
          // `reanudar_en` y entrega la conversación a una persona, porque no
          // hay cron que la reanude (ronda B1, arreglo 2).
          continue;
        }
        if (ruta.ir_a) {
          // Un destino inexistente ya lo dice la regla 2, con su propio aviso
          // grave: repetirlo aquí solo añadiría ruido al mismo error.
          if (idsPasos.has(ruta.ir_a)) pendientes.push({ id: ruta.ir_a, avisado: yaAvisado });
          continue;
        }
        // Ruta vacía: `aplicarRuta` pone `pasoActual` a null y la conversación
        // se acaba igual, solo que sin decirlo.
        if (!recogido) sinRecoger.add(id);
      }
    }

    for (const id of sinRecoger) {
      avisos.push({
        paso: id,
        mensaje: "Hay un camino que acaba aquí sin avisar a la comercial: el lead se queda sin que nadie le recoja.",
        grave: true,
      });
    }
  }

  return avisos;
}
