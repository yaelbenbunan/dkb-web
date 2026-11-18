import { ALLOWED_SENDERS } from "@/lib/campaign-send";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { MODULO_CAMPANAS, tieneModulo } from "@/lib/ventas/campanas";
import { listExclusiones } from "@/lib/ventas/db";
import { esMarcaPropia } from "@/lib/ventas/espacios";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { CondicionesForm } from "./CondicionesForm";
import { Exclusiones } from "./Exclusiones";
import { ModulosForm } from "./ModulosForm";
import { WebhookInfo } from "./WebhookInfo";

export default async function CondicionesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { usuaria, marca } = await requireAccesoMarca(slug, "condiciones");
  const exclusiones = await listExclusiones(marca.id);
  const admin = usuaria.rol === "admin";
  // CondicionesForm es "use client": lo que se le pase como prop viaja al
  // navegador dentro del payload de React, aunque la UI no lo enseñe. Por eso
  // el secreto del webhook se separa aquí y solo llega a WebhookInfo, que sí
  // está protegido por `admin &&`.
  const { webhook_secret, ...marcaSinSecreto } = marca;

  const ajustes = (
    <>
      <CondicionesForm marca={marcaSinSecreto} editable={admin} />
      <ModulosForm
        marcaId={marca.id}
        campanas={tieneModulo(marca, MODULO_CAMPANAS)}
        remitentes={marca.campanas_remitentes ?? []}
        remitentesGlobales={ALLOWED_SENDERS}
        editable={admin}
      />
      <Exclusiones marcaId={marca.id} exclusiones={exclusiones} editable={admin} />
    </>
  );

  // Dinkbit (desde Ajustes): todo, como siempre.
  if (esMarcaPropia(marca.slug)) {
    return (
      <div>
        <MarcaCabecera marca={marca} activa="condiciones" rol={usuaria.rol} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ajustes}
          {admin && <WebhookInfo marcaId={marca.id} slug={marca.slug} secreto={webhook_secret} />}
        </div>
      </div>
    );
  }

  // Un cliente: «Entrada de leads». Lo que se usa es el enlace de los anuncios
  // con su secreto; condiciones, módulos y exclusiones quedan plegados para admin.
  return (
    <div>
      <MarcaCabecera marca={marca} activa="condiciones" rol={usuaria.rol} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {admin ? (
          <WebhookInfo marcaId={marca.id} slug={marca.slug} secreto={webhook_secret} />
        ) : (
          <section style={tarjeta}>
            <h2 style={titulo}>Entrada de leads de anuncios</h2>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#475569" }}>Los leads de los anuncios entran por esta dirección (en Zapier o en la landing):</p>
            <p style={{ background: "#f1f5f9", borderRadius: 6, padding: "6px 8px", fontSize: 13, wordBreak: "break-all", margin: "0 0 8px" }}>
              https://www.dinkbit.es/api/ventas/leads/{marca.slug}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>La contraseña (secreto) solo la ve admin.</p>
          </section>
        )}
        {admin && (
          <details style={{ ...tarjeta, padding: "12px 20px" }}>
            <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#475569" }}>Otros ajustes (condiciones, estado, módulos y exclusiones)</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>{ajustes}</div>
          </details>
        )}
      </div>
    </div>
  );
}
