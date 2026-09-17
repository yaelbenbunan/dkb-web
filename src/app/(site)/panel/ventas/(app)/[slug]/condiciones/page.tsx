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

  return (
    <div>
      <MarcaCabecera marca={marca} activa="condiciones" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CondicionesForm marca={marca} editable={admin} />
        <Exclusiones marcaId={marca.id} exclusiones={exclusiones} editable={admin} />
        {admin && <WebhookInfo marcaId={marca.id} slug={marca.slug} secreto={marca.webhook_secret} />}
      </div>
    </div>
  );
}
