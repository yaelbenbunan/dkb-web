import Link from "next/link";
import { tarjeta } from "../../../_componentes/estilos";

/** Lo que se ve en Campañas de una marca sin el módulo contratado. */
export function ModuloApagado({ slug, admin }: { slug: string; admin: boolean }) {
  return (
    <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 8 }}>
      <strong style={{ fontSize: 15 }}>Campañas no está activado en esta marca</strong>
      <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
        Es un servicio opcional para clientes. {admin ? "Puedes activarlo en Condiciones." : "Pídeselo a un admin."}
      </p>
      {admin && (
        <Link href={`/panel/ventas/${slug}/condiciones`} style={{ fontSize: 14, color: "#187bef" }}>
          Ir a Condiciones →
        </Link>
      )}
    </section>
  );
}
