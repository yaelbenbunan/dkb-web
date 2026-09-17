import { requireUsuaria } from "@/lib/ventas/auth";
import { listExclusiones } from "@/lib/ventas/db";
import { cargarMarca } from "../../../_componentes/cargarMarca";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { CondicionesForm } from "./CondicionesForm";
import { Exclusiones } from "./Exclusiones";
import { WebhookInfo } from "./WebhookInfo";

export default async function CondicionesPage({ params }: { params: Promise<{ slug: string }> }) {
  const usuaria = await requireUsuaria();
  const { slug } = await params;
  const marca = await cargarMarca(slug);
  const exclusiones = await listExclusiones(marca.id);
  const admin = usuaria.rol === "admin";
  // CondicionesForm es "use client": lo que se le pase como prop viaja al
  // navegador dentro del payload de React, aunque la UI no lo enseñe. Por eso
  // el secreto del webhook se separa aquí y solo llega a WebhookInfo, que sí
  // está protegido por `admin &&`.
  const { webhook_secret, ...marcaSinSecreto } = marca;

  return (
    <div>
      <MarcaCabecera marca={marca} activa="condiciones" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CondicionesForm marca={marcaSinSecreto} editable={admin} />
        <Exclusiones marcaId={marca.id} exclusiones={exclusiones} editable={admin} />
        {admin && <WebhookInfo marcaId={marca.id} slug={marca.slug} secreto={webhook_secret} />}
      </div>
    </div>
  );
}
