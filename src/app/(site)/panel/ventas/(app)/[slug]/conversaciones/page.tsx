import { requireUsuaria } from "@/lib/ventas/auth";
import { listLeads } from "@/lib/ventas/db";
import { etiquetaVentana, extracto } from "@/lib/whatsapp/bandeja";
import { getConversacionPorId, listConversaciones, listMensajes } from "@/lib/whatsapp/db";
import { telefonoDeWaId, ventanaAbierta } from "@/lib/whatsapp/ventana";
import { cargarMarca } from "../../../_componentes/cargarMarca";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { Conversaciones, type Hilo, type TarjetaConversacion } from "./Conversaciones";

/** «Nombre» que se enseña de una conversación: el negocio/contacto del lead
 *  vinculado, o el teléfono cuando todavía no hay lead (p.ej. alguien que
 *  escribe antes de que la venta lo dé de alta). */
function nombreConversacion(waId: string, leadId: string | null, nombres: Map<string, string>): string {
  if (leadId) {
    const nombre = nombres.get(leadId);
    if (nombre) return nombre;
  }
  return telefonoDeWaId(waId) ?? waId;
}

export default async function ConversacionesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  await requireUsuaria();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const marca = await cargarMarca(slug);

  const [conversaciones, leads] = await Promise.all([listConversaciones(marca.id), listLeads(marca.id)]);
  const nombres = new Map(leads.map((l) => [l.id, l.contacto || l.negocio]));
  const ahora = new Date();

  const lista: TarjetaConversacion[] = conversaciones.map((c) => ({
    id: c.id,
    nombre: nombreConversacion(c.wa_id, c.lead_id, nombres),
    extracto: extracto(c.ultimo_texto),
    etiquetaVentana: etiquetaVentana(c.ventana_hasta, ahora),
    ultimoMensajeAt: c.ultimo_mensaje_at,
  }));

  // Búsqueda puntual (no un `.find()` sobre las hasta 500 conversaciones ya
  // traídas para la lista): solo hace falta releer una fila.
  const candidata = sp.c ? await getConversacionPorId(sp.c) : null;
  const seleccionada = candidata && candidata.marca_id === marca.id ? candidata : null;
  const mensajes = seleccionada ? await listMensajes(seleccionada.id) : [];

  const hilo: Hilo | null = seleccionada
    ? {
        id: seleccionada.id,
        nombre: nombreConversacion(seleccionada.wa_id, seleccionada.lead_id, nombres),
        leadId: seleccionada.lead_id,
        etiquetaVentana: etiquetaVentana(seleccionada.ventana_hasta, ahora),
        ventanaAbierta: ventanaAbierta(seleccionada.ventana_hasta, ahora),
        mensajes: mensajes.map((m) => ({
          id: m.id,
          direccion: m.direccion,
          texto: m.texto,
          estado: m.estado,
          error: m.error,
          createdAt: m.created_at,
        })),
      }
    : null;

  return (
    <div>
      <MarcaCabecera marca={marca} activa="conversaciones" />
      <Conversaciones slug={slug} conversaciones={lista} hilo={hilo} />
    </div>
  );
}
