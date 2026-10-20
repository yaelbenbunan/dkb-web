import { requireAccesoMarca } from "@/lib/ventas/auth";
import { evaluarAccesoMarca } from "@/lib/ventas/rutas";
import { listLeads } from "@/lib/ventas/db";
import { botonesDePayload, etiquetaOrigen, etiquetaVentana, extracto, nombreConversacion } from "@/lib/whatsapp/bandeja";
import { getConversacionPorId, listConversaciones, listMensajes } from "@/lib/whatsapp/db";
import { ventanaAbierta } from "@/lib/whatsapp/ventana";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { Conversaciones, type Hilo, type TarjetaConversacion } from "./Conversaciones";

export default async function ConversacionesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { usuaria, marca } = await requireAccesoMarca(slug, "conversaciones");

  const [conversaciones, leads] = await Promise.all([listConversaciones(marca.id), listLeads(marca.id)]);
  const nombres = new Map(leads.map((l) => [l.id, l.contacto || l.negocio]));
  const ahora = new Date();

  const lista: TarjetaConversacion[] = conversaciones.map((c) => ({
    id: c.id,
    nombre: nombreConversacion(c.wa_id, c.lead_id, nombres, c.nombre_contacto),
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
        nombre: nombreConversacion(seleccionada.wa_id, seleccionada.lead_id, nombres, seleccionada.nombre_contacto),
        leadId: seleccionada.lead_id,
        etiquetaVentana: etiquetaVentana(seleccionada.ventana_hasta, ahora),
        ventanaAbierta: ventanaAbierta(seleccionada.ventana_hasta, ahora),
        mensajes: mensajes.map((m) => ({
          id: m.id,
          direccion: m.direccion,
          texto: m.texto,
          estado: m.estado,
          error: m.error,
          botones: botonesDePayload(m.payload),
          origen: etiquetaOrigen(m.origen),
          createdAt: m.created_at,
        })),
      }
    : null;

  return (
    <div>
      <MarcaCabecera marca={marca} activa="conversaciones" rol={usuaria.rol} />
      {/* La agente solo atiende el chat: sin acceso a Leads, el enlace a la ficha la mandaría a un «sin permiso». */}
      <Conversaciones slug={slug} conversaciones={lista} hilo={hilo} conFicha={evaluarAccesoMarca(usuaria, marca.id, "leads") === "ok"} />
    </div>
  );
}
