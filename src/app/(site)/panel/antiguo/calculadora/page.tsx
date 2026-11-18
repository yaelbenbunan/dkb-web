import { getServiceCatalog, CATALOG_SNAPSHOT_DATE } from "@/lib/service-catalog";
import { PanelShell } from "../_componentes/PanelShell";
import { Calculadora } from "./Calculadora";

export const metadata = {
  title: "Calculadora — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const { catalogo, live } = await getServiceCatalog();
  const totalServicios = Object.values(catalogo).reduce((a, l) => a + l.length, 0);

  return (
    <PanelShell activa="calculadora">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: "#475569", marginTop: 0, marginBottom: 18 }}>
          Arma un presupuesto en directo: elige los servicios y los meses a
          proyectar. El total se calcula al instante.{" "}
          <span style={{ color: "#94a3b8" }}>
            {totalServicios} servicios ·{" "}
            {live ? "catálogo en vivo" : `catálogo del ${CATALOG_SNAPSHOT_DATE}`}
          </span>
        </p>
        <Calculadora catalogo={catalogo} />
      </div>
    </PanelShell>
  );
}
