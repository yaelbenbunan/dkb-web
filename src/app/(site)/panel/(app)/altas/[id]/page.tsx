import Link from "next/link";
import { notFound } from "next/navigation";
import { firmarDescargas, getAltaPorId } from "@/lib/altas/db";
import { enlaceAlta } from "@/lib/altas/token";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getMarcaPorId } from "@/lib/ventas/db";
import { DatosAlta } from "../../../_componentes/DatosAlta";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { ActivarAlta } from "../ActivarAlta";
import { CopiarEnlace } from "../CopiarEnlace";
import { CrearFicha } from "../CrearFicha";
import { fechaHora } from "../fechas";

export default async function AltaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUsuaria("admin");
  const { id } = await params;
  const alta = await getAltaPorId(id);
  if (!alta) notFound();
  // Se firman al pintar la página: caducan en 1 h; recargar da enlaces nuevos.
  const [descargas, ficha] = await Promise.all([firmarDescargas(alta.archivos), alta.marca_id ? getMarcaPorId(alta.marca_id) : null]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/panel/altas" style={{ color: "#187bef", fontSize: 14, textDecoration: "none" }}>
        ← Altas
      </Link>
      <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 style={{ ...titulo, fontSize: 22, margin: 0 }}>{alta.cliente}</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
          Creada el {fechaHora(alta.created_at)} ·{" "}
          {alta.enviada_en ? (
            <span style={{ color: "#16a34a", fontWeight: 600 }}>enviada el {fechaHora(alta.enviada_en)}</span>
          ) : (
            <span style={{ color: "#b45309", fontWeight: 600 }}>pendiente de enviar</span>
          )}
          {!alta.activa && <span style={{ color: "#b91c1c", fontWeight: 600 }}> · enlace desactivado</span>}
        </p>
        {alta.activa && <CopiarEnlace enlace={enlaceAlta(alta.token)} />}
        <ActivarAlta id={alta.id} activa={alta.activa} />
      </section>

      {alta.enviada_en && (
        <section style={{ ...tarjeta, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderLeft: "4px solid #1557b8" }}>
          {ficha ? (
            <>
              <span style={{ flex: "1 1 260px", fontSize: 14 }}>
                Este alta ya tiene ficha: <strong>{ficha.nombre}</strong>.
              </span>
              <Link href={`/panel/${ficha.slug}/ficha`} style={{ color: "#187bef", fontWeight: 700, textDecoration: "none" }}>
                Abrir la ficha →
              </Link>
            </>
          ) : (
            <>
              <span style={{ flex: "1 1 260px", fontSize: 14 }}>
                El cliente ya ha enviado el alta. Crea su ficha: tendrá esta información, sus archivos, sus tareas y sus leads en una sola carpeta.
              </span>
              <CrearFicha altaId={alta.id} />
            </>
          )}
        </section>
      )}

      {!alta.enviada_en && (
        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>El cliente aún no ha enviado el formulario: cuando lo haga, aquí verás sus respuestas y archivos.</p>
      )}

      {alta.enviada_en && <DatosAlta alta={alta} descargas={descargas} />}
    </div>
  );
}
