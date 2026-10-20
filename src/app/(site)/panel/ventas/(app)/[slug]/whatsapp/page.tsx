import { requireAccesoMarca } from "@/lib/ventas/auth";
import type { Marca } from "@/lib/ventas/db";
import { puedeConectarWhatsApp } from "@/lib/ventas/rutas";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { ConectarWhatsApp } from "./ConectarWhatsApp";

const FECHA = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" });

const HISTORIAL: Record<string, string> = {
  pedido: "Pedido a Meta: las conversaciones antiguas van llegando.",
  completo: "Importado.",
  rechazado: "El negocio no compartió el historial desde la app de WhatsApp Business.",
};

const fila = { display: "flex", gap: 12, fontSize: 14, color: "#1e293b", margin: "0 0 8px" } as const;
const clave = { minWidth: 110, color: "#64748b", fontWeight: 600 } as const;

function Estado({ marca }: { marca: Marca }) {
  const conectada = marca.whatsapp_estado === "conectado" && marca.whatsapp_phone_number_id;
  if (conectada) {
    return (
      <>
        <p style={fila}>
          <span style={clave}>Estado</span>
          <span style={{ color: "#16a34a", fontWeight: 700 }}>Conectado</span>
        </p>
        <p style={fila}>
          <span style={clave}>Número (ID)</span>
          <span>{marca.whatsapp_phone_number_id}</span>
        </p>
        {marca.whatsapp_conectado_en && (
          <p style={fila}>
            <span style={clave}>Desde</span>
            <span>{FECHA.format(new Date(marca.whatsapp_conectado_en))}</span>
          </p>
        )}
      </>
    );
  }
  if (marca.whatsapp_estado === "desconectado") {
    return (
      <>
        <p style={fila}>
          <span style={clave}>Estado</span>
          <span style={{ color: "#b91c1c", fontWeight: 700 }}>Desconectado</span>
        </p>
        <p style={fila}>
          <span style={clave}>Motivo</span>
          <span>{marca.whatsapp_motivo || "Meta no indicó el motivo."}</span>
        </p>
      </>
    );
  }
  return (
    <p style={fila}>
      <span style={clave}>Estado</span>
      <span>Sin conectar</span>
    </p>
  );
}

export default async function WhatsAppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // La agente no tiene la sección: requireAccesoMarca la redirige.
  const { usuaria, marca } = await requireAccesoMarca(slug, "whatsapp");
  const puedeConectar = puedeConectarWhatsApp(usuaria, marca.id);
  const conNumero = Boolean(marca.whatsapp_phone_number_id);

  return (
    <div>
      <MarcaCabecera marca={marca} activa="whatsapp" rol={usuaria.rol} />
      <section style={{ ...tarjeta, maxWidth: 640 }}>
        <h2 style={titulo}>Número de WhatsApp</h2>
        <Estado marca={marca} />
        {conNumero && (
          <p style={fila}>
            <span style={clave}>Historial</span>
            <span>{(marca.whatsapp_historial && HISTORIAL[marca.whatsapp_historial]) || "Sin pedir."}</span>
          </p>
        )}
        {puedeConectar ? (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569" }}>
              Se abre una ventana de Meta para elegir el número de la app de WhatsApp Business. El número sigue funcionando en el móvil.
            </p>
            {/* Solo primitivos al componente cliente: la marca lleva secretos. */}
            <ConectarWhatsApp slug={slug} texto={conNumero ? "Reconectar" : "Conectar WhatsApp"} />
          </div>
        ) : (
          <p style={{ margin: "16px 0 0", fontSize: 13, color: "#64748b" }}>Solo la marca o un administrador pueden conectar el número.</p>
        )}
      </section>
    </div>
  );
}
