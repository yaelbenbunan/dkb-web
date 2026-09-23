import { describe, expect, it } from "vitest";
import { decidir, extraerEstados, extraerMensajes } from "../entrante";

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
    tipo: "text",
    recibidoEn: new Date(),
    // No se usa en `decidir`; se rellena solo para que el fixture cumpla la
    // interfaz `MensajeEntrante` tras añadir el campo `crudo`.
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
