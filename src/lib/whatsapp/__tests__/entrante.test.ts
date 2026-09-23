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
