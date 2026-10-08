"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../_componentes/estilos";
import { buscarAction, enriquecerTandaAction } from "./actions";
import type { Aviso } from "./Prospeccion";

/** 60 empresas en tandas de 10 son 6 vueltas; el margen cubre reintentos. Con
 *  tope, un fallo que no deje avanzar no convierte el bucle en infinito. */
const MAX_TANDAS = 12;

export function Buscador({
  placesConfigurado,
  pendientes,
  onAviso,
}: {
  placesConfigurado: boolean;
  /** Búsquedas con empresas aún sin revisar (se cerró la pestaña a medias). */
  pendientes: Array<{ searchId: string; n: number }>;
  onAviso: (a: Aviso | null) => void;
}) {
  const router = useRouter();
  const [categoria, setCategoria] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fase, setFase] = useState<null | "buscando" | "emails">(null);
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    onAviso(null);
    setFase("buscando");
    let searchId: string;
    try {
      const r = await buscarAction(categoria, ciudad);
      if (!r.ok) {
        setFase(null);
        onAviso({ ok: false, texto: r.error });
        return;
      }
      onAviso({ ok: true, texto: r.mensaje });
      searchId = r.searchId;
    } catch {
      setFase(null);
      router.refresh();
      onAviso({ ok: false, texto: "La búsqueda se interrumpió. Vuelve a intentarlo." });
      return;
    }

    await revisarWebs([searchId]);
  }

  /** Emails: tandas de diez hasta que no quede ninguna empresa por mirar. */
  async function revisarWebs(searchIds: string[]) {
    setFase("emails");
    setProgreso({ hechos: 0, total: 0 });
    let hechos = 0;
    let quedan = 0;
    let sinTerminar = 0;
    try {
      for (const searchId of searchIds) {
        quedan = 0;
        for (let i = 0; i < MAX_TANDAS; i++) {
          const t = await enriquecerTandaAction(searchId);
          hechos += t.procesados;
          quedan = t.restantes;
          setProgreso({ hechos, total: hechos + t.restantes });
          if (t.restantes === 0) break;
        }
        sinTerminar += quedan;
      }
      onAviso(
        sinTerminar > 0
          ? { ok: false, texto: `Se revisaron ${hechos} webs, pero quedan empresas sin revisar. Puedes retomarlo desde el enlace de abajo.` }
          : { ok: true, texto: `Revisión terminada: ${hechos} web${hechos === 1 ? "" : "s"} revisada${hechos === 1 ? "" : "s"}.` },
      );
    } catch {
      onAviso({ ok: false, texto: "La revisión de webs se interrumpió. Lo ya revisado está guardado; puedes retomarla." });
    } finally {
      setFase(null);
      router.refresh();
    }
  }

  const porRevisar = pendientes.reduce((suma, p) => suma + p.n, 0);

  return (
    <form onSubmit={buscar} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={titulo}>Buscar negocios</h2>
      {!placesConfigurado && (
        <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
          Falta configurar <code>GOOGLE_PLACES_API_KEY</code>: la búsqueda no está disponible.
        </p>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={etiqueta}>
          Qué buscar
          <input style={{ ...campo, width: 240 }} value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="restaurante, clínica dental…" required maxLength={80} />
        </label>
        <label style={etiqueta}>
          Ciudad
          <input style={{ ...campo, width: 200 }} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Madrid" required maxLength={80} />
        </label>
        <button type="submit" disabled={!placesConfigurado || fase !== null} style={{ ...botonPrimario, opacity: !placesConfigurado || fase !== null ? 0.6 : 1 }}>
          {fase === "buscando" ? "Buscando…" : fase === "emails" ? "Buscando emails…" : "Buscar"}
        </button>
        {fase === "emails" && progreso.total > 0 && (
          <span style={{ fontSize: 13, color: "#475569" }}>
            {progreso.hechos} de {progreso.total} webs revisadas
          </span>
        )}
      </div>
      {fase === null && porRevisar > 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
          Quedan {porRevisar} empresas sin revisar de una búsqueda anterior.{" "}
          <button
            type="button"
            onClick={() => revisarWebs(pendientes.map((p) => p.searchId))}
            style={{ background: "none", border: "none", padding: 0, color: "#187bef", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            Buscar sus emails
          </button>
        </p>
      )}
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        Hasta 60 negocios por búsqueda. Después se lee la web de cada uno para encontrar su email.
      </p>
    </form>
  );
}
