"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIAS } from "@/lib/prospeccion/categorias";
import { ATRIBUCION_OVERTURE } from "@/lib/prospeccion/overture";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";
import { buscarAction } from "../../../acciones-prospeccion";
import type { Aviso } from "./Prospeccion";

/** Busca negocios y los guarda. Ya no lee sus webs en busca de emails: el
 *  email se pide en la llamada, a quien acepta recibir información (RGPD art.
 *  5.1.c, minimización). */
export function Buscador({ slug, onAviso }: { slug: string; onAviso: (a: Aviso | null) => void }) {
  const router = useRouter();
  const [categoria, setCategoria] = useState(CATEGORIAS[0].clave);
  const [ciudad, setCiudad] = useState("");
  const [buscando, setBuscando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    onAviso(null);
    setBuscando(true);
    try {
      const r = await buscarAction(slug, categoria, ciudad);
      onAviso(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error });
    } catch {
      onAviso({ ok: false, texto: "La búsqueda se interrumpió. Vuelve a intentarlo." });
    } finally {
      setBuscando(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={buscar} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={titulo}>Buscar negocios</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={etiqueta}>
          Qué buscar
          <select style={{ ...campo, width: 240 }} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c.clave} value={c.clave}>{c.texto}</option>
            ))}
          </select>
        </label>
        <label style={etiqueta}>
          Municipio o provincia
          <input style={{ ...campo, width: 200 }} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Getafe" required maxLength={80} />
        </label>
        <button type="submit" disabled={buscando} style={{ ...botonPrimario, opacity: buscando ? 0.6 : 1 }}>
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        Hasta 200 negocios nuevos por búsqueda; los que tienen teléfono, primero. Se les llama: solo a quien acepta recibir información se le pide el email y se le escribe.
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        Datos de negocios:{" "}
        <a href={ATRIBUCION_OVERTURE.url} target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>{ATRIBUCION_OVERTURE.texto}</a>{" "}
        (con datos de {ATRIBUCION_OVERTURE.fuentes}; licencias {ATRIBUCION_OVERTURE.licencias};{" "}
        <a href={ATRIBUCION_OVERTURE.urlAtribucion} target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>atribución completa</a>) y ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>colaboradores de OpenStreetMap</a> (ODbL).
      </p>
    </form>
  );
}
