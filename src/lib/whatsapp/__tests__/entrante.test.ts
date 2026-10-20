import { describe, expect, it } from "vitest";
import {
  decidir,
  extraerAvisosCuenta,
  extraerContactos,
  extraerEcos,
  extraerEstados,
  extraerHistorial,
  extraerMensajes,
  limpiarNombre,
} from "../entrante";

const sobre = (value: unknown) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "1058918150452294", changes: [{ field: "messages", value }] }],
});

describe("extraerMensajes", () => {
  it("saca texto, wa_id y referral de un mensaje de anuncio", () => {
    const [m] = extraerMensajes(
      sobre({
        messaging_product: "whatsapp",
        messages: [
          {
            id: "wamid.A",
            from: "34660415514",
            timestamp: "1790000000",
            type: "text",
            text: { body: "hola" },
            referral: {
              source_id: "120200000000",
              headline: "Tu web en 7 días",
              ctwa_clid: "abc",
            },
          },
        ],
      }),
    );
    expect(m.wamid).toBe("wamid.A");
    expect(m.waId).toBe("34660415514");
    expect(m.texto).toBe("hola");
    expect(m.referral?.anuncio).toBe("120200000000");
    expect(m.referral?.titular).toBe("Tu web en 7 días");
  });

  // Review Focus 1: los no-texto no pueden romper ni generar respuesta vacía.
  it("acepta mensajes que no son de texto dejando el texto a null", () => {
    const [m] = extraerMensajes(
      sobre({
        messages: [
          { id: "wamid.B", from: "34660415514", timestamp: "1790000000", type: "image", image: { id: "i1" } },
        ],
      }),
    );
    expect(m.tipo).toBe("image");
    expect(m.texto).toBeNull();
  });

  // Review Focus 3: cuerpos sin mensajes no producen nada.
  it("devuelve lista vacía si no hay mensajes", () => {
    expect(extraerMensajes(sobre({ statuses: [] }))).toEqual([]);
    expect(extraerMensajes({})).toEqual([]);
    expect(extraerMensajes(null)).toEqual([]);
  });
});

describe("extraerEstados", () => {
  it("traduce los estados de entrega de Meta", () => {
    const estados = extraerEstados(
      sobre({ statuses: [{ id: "wamid.A", status: "delivered" }, { id: "wamid.B", status: "read" }] }),
    );
    expect(estados).toEqual([
      { wamid: "wamid.A", estado: "entregado" },
      { wamid: "wamid.B", estado: "leido" },
    ]);
  });
});

describe("decidir", () => {
  const base = {
    wamid: "w",
    waId: "34660415514",
    texto: "hola",
    // No se usa en `decidir`; se rellena solo para que el fixture cumpla la
    // interfaz `MensajeEntrante` tras añadir los campos `crudo` y `botonId`.
    botonId: null,
    numeroId: null,
    nombrePerfil: null,
    tipo: "text",
    recibidoEn: new Date(),
    crudo: null,
  };
  const conRef = { ...base, referral: { campana: "c", anuncio: "a", titular: null } };
  const sinRef = { ...base, referral: null };

  it("crea lead y responde si viene de anuncio y no hay lead", () => {
    expect(decidir({ mensaje: conRef, conversacion: null, leadExiste: false }))
      .toEqual({ accion: "crear_lead_y_responder" });
  });

  it("solo responde si viene de anuncio y el lead ya existe", () => {
    expect(decidir({ mensaje: conRef, conversacion: null, leadExiste: true }))
      .toEqual({ accion: "responder" });
  });

  it("no responde a quien llega sin anuncio", () => {
    expect(decidir({ mensaje: sinRef, conversacion: null, leadExiste: false }))
      .toEqual({ accion: "solo_guardar" });
  });

  it("guarda la respuesta cuando la conversación estaba en bot", () => {
    expect(decidir({ mensaje: sinRef, conversacion: { estado: "bot" }, leadExiste: true }))
      .toEqual({ accion: "guardar_respuesta" });
  });

  it("no vuelve a responder en una conversación ya humana", () => {
    expect(decidir({ mensaje: sinRef, conversacion: { estado: "humana" }, leadExiste: true }))
      .toEqual({ accion: "solo_guardar" });
  });

  it("un mensaje sin texto en conversación bot no cuenta como respuesta", () => {
    expect(decidir({ mensaje: { ...sinRef, texto: null, tipo: "image" }, conversacion: { estado: "bot" }, leadExiste: true }))
      .toEqual({ accion: "solo_guardar" });
  });
});

// Ronda de arreglos 1: casos adversarios que hoy funcionan por diseño, no por
// suerte. Ninguno debe lanzar; todos deben descartar el mensaje afectado (o
// devolver lista vacía) sin tocar el resto del lote.
describe("extraerMensajes — casos adversarios", () => {
  it("entry que no es array no revienta y no produce mensajes", () => {
    expect(extraerMensajes({ object: "whatsapp_business_account", entry: "no-array" })).toEqual([]);
  });

  it("changes que no es array no revienta", () => {
    expect(
      extraerMensajes({ object: "whatsapp_business_account", entry: [{ id: "1", changes: "no-array" }] }),
    ).toEqual([]);
  });

  it("value que es una cadena no revienta", () => {
    expect(
      extraerMensajes({
        object: "whatsapp_business_account",
        entry: [{ id: "1", changes: [{ field: "messages", value: "no-objeto" }] }],
      }),
    ).toEqual([]);
  });

  it("un null dentro de messages[] se descarta sin romper el resto del lote", () => {
    const mensajes = extraerMensajes(
      sobre({
        messages: [
          null,
          { id: "wamid.OK", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "hola" } },
        ],
      }),
    );
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0].wamid).toBe("wamid.OK");
  });

  it("un mensaje sin id se descarta", () => {
    expect(
      extraerMensajes(sobre({ messages: [{ from: "34660415514", timestamp: "1790000000", type: "text" }] })),
    ).toEqual([]);
  });

  it("un mensaje sin from se descarta", () => {
    expect(
      extraerMensajes(sobre({ messages: [{ id: "wamid.X", timestamp: "1790000000", type: "text" }] })),
    ).toEqual([]);
  });

  it("un referral que no es objeto (p.ej. true) se ignora sin romper el mensaje", () => {
    const [m] = extraerMensajes(
      sobre({
        messages: [
          {
            id: "wamid.R",
            from: "34660415514",
            timestamp: "1790000000",
            type: "text",
            text: { body: "hola" },
            referral: true,
          },
        ],
      }),
    );
    expect(m.referral).toBeNull();
  });

  // Review Focus 1 (Ronda 1, Critical): Number("") vale 0, no NaN. Sin el
  // suelo de cordura esto colaría como `new Date(0)` (1970) en silencio.
  it("un timestamp vacío se descarta en vez de convertirse en 1970", () => {
    expect(
      extraerMensajes(sobre({ messages: [{ id: "wamid.T1", from: "34660415514", timestamp: "", type: "text" }] })),
    ).toEqual([]);
  });

  it("un timestamp no numérico se descarta", () => {
    expect(
      extraerMensajes(sobre({ messages: [{ id: "wamid.T2", from: "34660415514", timestamp: "abc", type: "text" }] })),
    ).toEqual([]);
  });

  it("un timestamp negativo se descarta", () => {
    expect(
      extraerMensajes(sobre({ messages: [{ id: "wamid.T3", from: "34660415514", timestamp: "-1", type: "text" }] })),
    ).toEqual([]);
  });

  // Minor 1 (ronda de arreglos 2): el suelo no tenía techo. Un timestamp de
  // 13 dígitos (milisegundos en vez de segundos, por error) pasaba el suelo
  // sin problema y producía una fecha del año ~58700, con la que
  // `ventanaAbierta` daría `true` para siempre.
  it("un timestamp de 13 dígitos (milisegundos por error) se descarta", () => {
    expect(
      extraerMensajes(
        sobre({ messages: [{ id: "wamid.T4", from: "34660415514", timestamp: "1790000000000", type: "text" }] }),
      ),
    ).toEqual([]);
  });
});

describe("extraerMensajes — crudo", () => {
  it("crudo conserva un campo que no se extrae, como image.id", () => {
    const [m] = extraerMensajes(
      sobre({
        messages: [
          {
            id: "wamid.IMG",
            from: "34660415514",
            timestamp: "1790000000",
            type: "image",
            image: { id: "img-123", mime_type: "image/jpeg" },
          },
        ],
      }),
    );
    expect(m.texto).toBeNull();
    expect((m.crudo as { image: { id: string } }).image.id).toBe("img-123");
  });
});

describe("extraerMensajes — botones", () => {
  const sobreBoton = (interactive: unknown) => ({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1058918150452294",
        changes: [
          {
            field: "messages",
            value: {
              messages: [
                {
                  id: "wamid.BTN",
                  from: "34660415514",
                  timestamp: "1790000000",
                  type: "interactive",
                  interactive,
                },
              ],
            },
          },
        ],
      },
    ],
  });

  it("guarda el texto del botón pulsado como respuesta del lead", () => {
    // Sin esto la pulsación se guardaba sin texto y la respuesta se perdía:
    // el lead contestaba y en su ficha no quedaba qué había elegido.
    const [m] = extraerMensajes(
      sobreBoton({ type: "button_reply", button_reply: { id: "opt_1", title: "Huecos en la agenda" } }),
    );
    expect(m.texto).toBe("Huecos en la agenda");
    expect(m.tipo).toBe("interactive");
  });

  it("también recoge la opción elegida en una lista", () => {
    const [m] = extraerMensajes(
      sobreBoton({ type: "list_reply", list_reply: { id: "opt_2", title: "Solo boca a boca" } }),
    );
    expect(m.texto).toBe("Solo boca a boca");
  });

  it("no revienta con un interactive de forma desconocida", () => {
    const [m] = extraerMensajes(sobreBoton({ type: "algo_nuevo_de_meta" }));
    // Comprueba también `botonId`: antes de la ronda de arreglos 1 solo se
    // comprobaba `texto`, así que un `botonId` colado no lo habría pillado
    // ningún test.
    expect(m.texto).toBeNull();
    expect(m.botonId).toBeNull();
  });

  it("conserva el id del botón pulsado, no solo su rótulo", () => {
    const [m] = extraerMensajes(
      sobreBoton({ type: "button_reply", button_reply: { id: "opcion_2", title: "Vienen 1 vez y ya" } }),
    );
    expect(m.botonId).toBe("opcion_2");
    expect(m.texto).toBe("Vienen 1 vez y ya");
  });

  it("deja el id a null cuando el lead escribe a mano", () => {
    const [m] = extraerMensajes(
      sobre({
        messages: [
          { id: "wamid.T", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "hola" } },
        ],
      }),
    );
    expect(m.botonId).toBeNull();
  });

  // Ronda de arreglos 1 (Important 2): formas hostiles de `interactive` y de
  // la respuesta dentro de él. Ninguna puede lanzar, y ninguna puede dejar
  // `texto` con valor si `botonId` se descarta (o viceversa) — es justo lo
  // que arregla que ambos salgan de la misma comprobación en
  // `respuestaDelMensaje`.
  it("interactive como cadena no revienta y deja texto/botonId a null", () => {
    const [m] = extraerMensajes({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1",
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  { id: "wamid.I1", from: "34660415514", timestamp: "1790000000", type: "interactive", interactive: "no-objeto" },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(m.texto).toBeNull();
    expect(m.botonId).toBeNull();
  });

  it("interactive como array no revienta y deja texto/botonId a null", () => {
    const [m] = extraerMensajes(sobreBoton([]));
    expect(m.texto).toBeNull();
    expect(m.botonId).toBeNull();
  });

  it("interactive como null no revienta y deja texto/botonId a null", () => {
    const [m] = extraerMensajes(sobreBoton(null));
    expect(m.texto).toBeNull();
    expect(m.botonId).toBeNull();
  });

  it("button_reply.id numérico con title válido no cuenta ni el id ni el texto", () => {
    // Caso del Important 1: si `id` y `title` no son AMBOS string, no se
    // guarda ninguno de los dos — nunca un rótulo sin su id.
    const [m] = extraerMensajes(
      sobreBoton({ type: "button_reply", button_reply: { id: 2, title: "Vienen 1 vez y ya" } }),
    );
    expect(m.texto).toBeNull();
    expect(m.botonId).toBeNull();
  });
});

const sobreCampo = (field: string, value: unknown) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "1058918150452294", changes: [{ field, value }] }],
});

describe("extraerMensajes — número y perfil", () => {
  it("saca numeroId del metadata y nombrePerfil de contacts", () => {
    const [m] = extraerMensajes(
      sobre({
        metadata: { phone_number_id: "PN1" },
        contacts: [
          { wa_id: "111", profile: { name: "Otro" } },
          { wa_id: "34660415514", profile: { name: "Ana" } },
        ],
        messages: [{ id: "wamid.P", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "hola" } }],
      }),
    );
    expect(m.numeroId).toBe("PN1");
    expect(m.nombrePerfil).toBe("Ana");
  });

  it("deja numeroId y nombrePerfil a null si no vienen", () => {
    const [m] = extraerMensajes(
      sobre({ messages: [{ id: "wamid.Q", from: "1", timestamp: "1790000000", type: "text", text: { body: "x" } }] }),
    );
    expect(m.numeroId).toBeNull();
    expect(m.nombrePerfil).toBeNull();
  });
});

describe("extraerEcos", () => {
  it("extrae un eco de texto de smb_message_echoes", () => {
    const [e] = extraerEcos(
      sobreCampo("smb_message_echoes", {
        metadata: { phone_number_id: "PN1" },
        message_echoes: [
          { from: "34900000000", to: "34660415514", id: "wamid.E", timestamp: "1790000000", type: "text", text: { body: "hola" } },
        ],
      }),
    );
    expect(e.wamid).toBe("wamid.E");
    expect(e.waId).toBe("34660415514");
    expect(e.numeroId).toBe("PN1");
    expect(e.texto).toBe("hola");
    expect(e.tipo).toBe("text");
    expect(e.enviadoEn).toEqual(new Date(1790000000 * 1000));
  });

  it("ignora un eco dentro de un cambio messages", () => {
    expect(
      extraerEcos(
        sobreCampo("messages", {
          message_echoes: [{ from: "a", to: "b", id: "w", timestamp: "1790000000", type: "text" }],
        }),
      ),
    ).toEqual([]);
  });

  it("descarta ecos con timestamp inválido y no lanza con basura", () => {
    const base = { from: "a", to: "b", id: "w", type: "text" };
    expect(
      extraerEcos(
        sobreCampo("smb_message_echoes", {
          message_echoes: [{ ...base, timestamp: "" }, { ...base, timestamp: "1790000000000" }, 5, null],
        }),
      ),
    ).toEqual([]);
    expect(extraerEcos(null)).toEqual([]);
  });

  it("extraerMensajes y extraerEstados ignoran otros campos", () => {
    const cuerpo = sobreCampo("smb_message_echoes", {
      messages: [{ id: "w", from: "a", timestamp: "1790000000", type: "text" }],
      statuses: [{ id: "w", status: "read" }],
    });
    expect(extraerMensajes(cuerpo)).toEqual([]);
    expect(extraerEstados(cuerpo)).toEqual([]);
  });
});

describe("extraerHistorial", () => {
  it("extrae un hilo con un mensaje de cada lado", () => {
    const [lote] = extraerHistorial(
      sobreCampo("history", {
        metadata: { phone_number_id: "PN1" },
        history: [
          {
            metadata: { phase: 0, chunk_order: 1, progress: 100 },
            threads: [
              {
                id: "34660415514",
                messages: [
                  { from: "34660415514", id: "wamid.H1", timestamp: "1790000000", type: "text", text: { body: "hola" } },
                  { from: "34900000000", id: "wamid.H2", timestamp: "1790000100", type: "text", text: { body: "qué tal" } },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(lote.numeroId).toBe("PN1");
    expect(lote.fase).toBe(0);
    expect(lote.progreso).toBe(100);
    expect(lote.error).toBeNull();
    expect(lote.hilos).toHaveLength(1);
    expect(lote.hilos[0].waId).toBe("34660415514");
    expect(lote.hilos[0].mensajes.map((m) => [m.wamid, m.deNegocio, m.texto])).toEqual([
      ["wamid.H1", false, "hola"],
      ["wamid.H2", true, "qué tal"],
    ]);
  });

  it("reporta el error 2593109 sin hilos", () => {
    const [lote] = extraerHistorial(
      sobreCampo("history", {
        metadata: { phone_number_id: "PN1" },
        history: [
          {
            errors: [
              {
                code: 2593109,
                title: "History sync is turned off by the business from the WhatsApp Business App",
                error_data: { details: "x" },
              },
            ],
          },
        ],
      }),
    );
    expect(lote.error?.codigo).toBe(2593109);
    expect(lote.error?.mensaje).toContain("History sync is turned off");
    expect(lote.hilos).toEqual([]);
  });

  it("descarta mensajes con timestamp inválido y no lanza con basura", () => {
    const [lote] = extraerHistorial(
      sobreCampo("history", {
        history: [{ threads: [{ id: "1", messages: [{ from: "1", id: "w", timestamp: "0", type: "text" }, 7] }, "x"] }],
      }),
    );
    expect(lote.hilos[0].mensajes).toEqual([]);
    expect(extraerHistorial({ entry: 3 })).toEqual([]);
  });
});

describe("extraerContactos", () => {
  it("normaliza el teléfono a dígitos", () => {
    const [c] = extraerContactos(
      sobreCampo("smb_app_state_sync", {
        metadata: { phone_number_id: "PN1" },
        state_sync: [
          {
            type: "contact",
            contact: { full_name: "Ana Pérez", first_name: "Ana", phone_number: "+34 600 11 22 33" },
            action: "add",
            metadata: { timestamp: "1790000000" },
          },
          { type: "otro", contact: { phone_number: "1" }, action: "add" },
        ],
      }),
    );
    expect(c).toEqual({ numeroId: "PN1", waId: "34600112233", nombre: "Ana Pérez", accion: "add" });
  });
});

describe("extraerAvisosCuenta", () => {
  it("extrae PARTNER_REMOVED con motivo", () => {
    const [a] = extraerAvisosCuenta(
      sobreCampo("account_update", {
        event: "PARTNER_REMOVED",
        waba_info: { waba_id: "W1", owner_business_id: "B1" },
        disconnection_info: { reason: "PRIMARY_INACTIVITY" },
      }),
    );
    expect(a).toEqual({ evento: "PARTNER_REMOVED", wabaId: "W1", motivo: "PRIMARY_INACTIVITY" });
  });

  it("motivo y wabaId a null si faltan", () => {
    const [a] = extraerAvisosCuenta(sobreCampo("account_update", { event: "PARTNER_ADDED" }));
    expect(a).toEqual({ evento: "PARTNER_ADDED", wabaId: null, motivo: null });
  });
});

describe("limpiarNombre", () => {
  it("quita bidi, ancho cero y control, y colapsa espacios", () => {
    expect(limpiarNombre("\u202Eabc\u200B\u0007  d\uFEFFe\u2066")).toBe("abc de");
  });
  it("recorta a 40 puntos de código", () => {
    expect(limpiarNombre("a".repeat(60))).toBe("a".repeat(40));
  });
  it("recorta por puntos de código sin partir un emoji", () => {
    const r = limpiarNombre("a".repeat(39) + "😀" + "b");
    expect(r).toBe("a".repeat(39) + "😀");
    expect(JSON.parse(JSON.stringify(r))).toBe(r);
    expect(/[\uD800-\uDFFF]/u.test(r!)).toBe(false);
  });
  it("quita cualquier carácter de formato (U+061C, U+2060) y suplentes sueltos", () => {
    expect(limpiarNombre("A\u061Cna\u2060 Paz")).toBe("Ana Paz");
    expect(limpiarNombre("Eva\uD800")).toBe("Eva");
  });
  it("normaliza NFKC", () => {
    expect(limpiarNombre("ＡＮＡ")).toBe("ANA");
  });
  it("null si no queda ninguna letra ni cifra", () => {
    expect(limpiarNombre("... --- !!!")).toBeNull();
    expect(limpiarNombre("\u2060\u061C")).toBeNull();
    expect(limpiarNombre("7")).toBe("7");
  });
  it("devuelve null si queda vacío o no hay nombre", () => {
    expect(limpiarNombre("\u200B \u202E")).toBeNull();
    expect(limpiarNombre(null)).toBeNull();
    expect(limpiarNombre(undefined)).toBeNull();
  });
  it("se aplica a nombrePerfil y a los contactos", () => {
    const [m] = extraerMensajes(
      sobre({
        contacts: [{ wa_id: "34660415514", profile: { name: "\u202EAna\u200B" } }],
        messages: [{ id: "wamid.L", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "hola" } }],
      }),
    );
    expect(m.nombrePerfil).toBe("Ana");
    const [c] = extraerContactos(
      sobreCampo("smb_app_state_sync", {
        state_sync: [{ type: "contact", action: "add", contact: { phone_number: "34660415514", full_name: "\u202EBea\u200B" } }],
      }),
    );
    expect(c.nombre).toBe("Bea");
  });
});
