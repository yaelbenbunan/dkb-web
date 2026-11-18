import { flujoDeMarca } from "@/lib/ventas/dominio";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { inicioDeMarca, rolConMarca } from "@/lib/ventas/rutas";
import { getMarcaPorId, listMarcas } from "@/lib/ventas/db";
import { esMarcaPropia } from "@/lib/ventas/espacios";
import { hoyMadrid } from "@/lib/ventas/metricas";
import { cargarPanelMarca, mesDeConsulta } from "@/lib/ventas/paneles";
import { EmbudoVista } from "../../_componentes/EmbudoVista";
import { SelectorMes } from "../../_componentes/SelectorMes";
import { tarjeta } from "../../_componentes/estilos";
import { NuevaMarcaForm } from "./NuevaMarcaForm";
import { BotonAnclar } from "../../_componentes/BotonAnclar";

function Cifra({ texto, valor, alerta = false }: { texto: string; valor: number; alerta?: boolean }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{texto}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: alerta && valor > 0 ? "#b91c1c" : "#0f172a" }}>{valor}</div>
    </div>
  );
}

/** Todos los clientes: cada marca que no es dinkbit, con su resumen del mes. Dinkbit tiene su propio espacio. */
export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const usuaria = await requireUsuaria();
  if (rolConMarca(usuaria.rol)) {
    const marca = usuaria.marca_id ? await getMarcaPorId(usuaria.marca_id) : null;
    redirect(marca ? inicioDeMarca(usuaria.rol, marca.slug) : "/panel/login?aviso=sin-marca");
  }
  const sp = await searchParams;
  const mes = mesDeConsulta(sp.mes);
  const hoy = hoyMadrid();
  const marcas = (await listMarcas()).filter((m) => m.estado !== "finalizada" && !esMarcaPropia(m.slug));
  const paneles = await Promise.all(marcas.map((m) => cargarPanelMarca(m, mes, hoy)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Clientes</h1>
        <SelectorMes mes={mes} ruta="/panel/clientes" />
      </div>
      {paneles.length === 0 && <p style={{ color: "#64748b" }}>Todavía no hay ningún cliente activo.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))", gap: 16 }}>
        {paneles.map(({ marca, embudo, resumen }) => (
          <section key={marca.id} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/panel/${marca.slug}/ficha`} style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>
                {marca.nombre}
              </Link>
              {marca.estado === "pausada" && <span style={{ fontSize: 12, color: "#92400e" }}>Pausada</span>}
              {Array.isArray(usuaria.clientes_anclados) && <BotonAnclar marcaId={marca.id} anclado={usuaria.clientes_anclados.includes(marca.id)} />}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <Cifra texto="Leads nuevos" valor={resumen.leadsNuevos} />
              <Cifra texto="Llamadas" valor={resumen.llamadas} />
              <Cifra texto="Interesados" valor={resumen.interesados} />
              {flujoDeMarca(marca.slug).conMuestras ? <Cifra texto="Muestras" valor={resumen.muestras} /> : <Cifra texto="Propuestas" valor={resumen.propuestas} />}
              <Cifra texto="Seguim. atrasados" valor={resumen.seguimientosAtrasados} alerta />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Embudo acumulado</div>
              <EmbudoVista embudo={embudo} slug={marca.slug} />
            </div>
          </section>
        ))}
      </div>
      {usuaria.rol === "admin" && <NuevaMarcaForm />}
    </div>
  );
}
