"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ANTIGUEDADES_BORME, ATRIBUCION_BORME } from "@/lib/prospeccion/borme";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";
import { buscarEmpresasNuevasAction } from "../../../acciones-prospeccion";
import type { Aviso } from "./Prospeccion";

/** Empresas recién constituidas (BORME). Se les escribe por carta al domicilio
 *  social: no tienen web ni teléfono publicados. */
export function EmpresasNuevas({ slug, onAviso }: { slug: string; onAviso: (a: Aviso | null) => void }) {
  const router = useRouter();
  const [lugar, setLugar] = useState("");
  const [dias, setDias] = useState(ANTIGUEDADES_BORME[0]);
  const [objeto, setObjeto] = useState("");
  const [buscando, setBuscando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    onAviso(null);
    setBuscando(true);
    try {
      const r = await buscarEmpresasNuevasAction(slug, lugar, dias, objeto);
      onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
    } catch {
      onAviso({ ok: false, texto: "La búsqueda se interrumpió. Vuelve a intentarlo." });
    } finally {
      setBuscando(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={buscar} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={titulo}>Empresas nuevas (BORME)</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={etiqueta}>
          Municipio o provincia
          <input style={{ ...campo, width: 200 }} value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Getafe" required maxLength={80} />
        </label>
        <label style={etiqueta}>
          Constituidas en
          <select style={{ ...campo, width: 160 }} value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            {ANTIGUEDADES_BORME.map((d) => (
              <option key={d} value={d}>los últimos {d} días</option>
            ))}
          </select>
        </label>
        <label style={etiqueta}>
          Objeto social (opcional)
          <input style={{ ...campo, width: 200 }} value={objeto} onChange={(e) => setObjeto(e.target.value)} placeholder="restaurante" maxLength={40} />
        </label>
        <button type="submit" disabled={buscando} style={{ ...botonPrimario, opacity: buscando ? 0.6 : 1 }}>
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        Sociedades recién inscritas en el Registro Mercantil. No tienen web ni teléfono publicados: se les escribe por carta a su domicilio social, a la empresa y
        no a una persona («Preparar carta» en la lista). Revisa el código postal antes de enviarla.
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        <a href={ATRIBUCION_BORME.url} target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>{ATRIBUCION_BORME.texto}</a>. No es una publicación oficial.
      </p>
    </form>
  );
}
