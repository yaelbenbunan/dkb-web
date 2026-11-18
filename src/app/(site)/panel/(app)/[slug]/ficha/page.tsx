import Link from "next/link";
import { firmarDescargas, getAltaPorMarca, listAltas } from "@/lib/altas/db";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { SQL_FICHAS } from "@/lib/ventas/db";
import { nombreServicio, SERVICIOS } from "@/lib/ventas/proyectos";
import { DatosAlta } from "../../../_componentes/DatosAlta";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { ServiciosForm, VincularAlta } from "./FormularioFicha";

const aviso = { margin: 0, fontSize: 14, color: "#92400e", background: "#fef3c7", borderRadius: 8, padding: "10px 12px" } as const;

/**
 * La ficha del cliente: sus servicios contratados (de ellos salen las
 * plantillas de Tareas) y todo lo que rellenó en el alta, con sus logos y
 * archivos. Solo para el equipo.
 */
export default async function FichaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { usuaria, marca } = await requireAccesoMarca(slug, "ficha");
  const admin = usuaria.rol === "admin";
  const alta = await getAltaPorMarca(marca.id);
  const descargas = alta ? await firmarDescargas(alta.archivos) : new Map<string, string>();
  // Para unir un alta a un cliente que existía antes: las enviadas que aún no tienen ficha.
  const sinFicha =
    !alta && admin
      ? await listAltas().then((r) => (r.estado === "ok" ? r.altas.filter((a) => a.enviada_en && a.marca_id === null) : []))
      : [];
  const conMigracion = Array.isArray(marca.servicios);
  const servicios = conMigracion ? (marca.servicios as string[]) : [];

  return (
    <div>
      <MarcaCabecera marca={marca} activa="ficha" rol={usuaria.rol} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ ...titulo, margin: 0 }}>Servicios contratados</h2>
          {conMigracion ? (
            <>
              <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
                De aquí salen las tareas: en la pestaña{" "}
                <Link href={`/panel/${marca.slug}/tareas`} style={{ color: "#187bef" }}>Tareas</Link>, eliges las de cada servicio cuando toque empezarlo.
              </p>
              <ServiciosForm marcaId={marca.id} opciones={SERVICIOS.map((s) => ({ clave: s.clave, nombre: s.nombre }))} elegidos={servicios} />
            </>
          ) : (
            <p style={aviso}>Para guardar los servicios falta ejecutar en Supabase {SQL_FICHAS}.</p>
          )}
        </section>

        {alta?.enviada_en ? (
          <>
            <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
              Lo que rellenó en su alta
              {admin && (
                <>
                  {" "}
                  (<Link href={`/panel/altas/${alta.id}`} style={{ color: "#187bef" }}>ver el alta</Link>)
                </>
              )}
              . {servicios.length > 0 && `Servicios: ${servicios.map(nombreServicio).join(", ")}.`}
            </p>
            <DatosAlta alta={alta} descargas={descargas} />
          </>
        ) : (
          <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ ...titulo, margin: 0 }}>Datos del alta</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
              {alta
                ? "El cliente aún no ha enviado su alta: cuando lo haga, aquí saldrán sus datos fiscales, logos y archivos."
                : "Este cliente no tiene alta: sus datos fiscales, logos y archivos saldrán aquí cuando la envíe."}
              {admin && !alta && (
                <>
                  {" "}
                  Puedes crearle una en <Link href="/panel/altas" style={{ color: "#187bef" }}>Altas</Link>.
                </>
              )}
            </p>
            {sinFicha.length > 0 && <VincularAlta marcaId={marca.id} cliente={marca.nombre} altas={sinFicha.map((a) => ({ id: a.id, cliente: a.cliente }))} />}
          </section>
        )}
      </div>
    </div>
  );
}
