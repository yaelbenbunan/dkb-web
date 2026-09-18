"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useOptimistic, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";
import { FASE_COLORES, FASE_LABELS, type Fase } from "@/lib/ventas/dominio";
import { formatoFecha } from "@/lib/ventas/metricas";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import {
  COLUMNAS_TABLERO,
  MAX_TARJETAS_COLUMNA,
  agruparEnColumnas,
  columnaDeFase,
  estadoSeguimiento,
  fasesDestino,
  ordenarPorUrgencia,
  siguienteFase,
  type ColumnaId,
  type ColumnaTablero,
} from "@/lib/ventas/tablero";
import { moverLeadAction } from "../../../acciones-leads";
import { FaseEtiqueta } from "../../../_componentes/FaseEtiqueta";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonSecundario } from "../../../_componentes/estilos";

/** Lo único que el tablero sabe de un lead: datos planos, sin nada de la marca. */
export interface TarjetaLead {
  id: string;
  negocio: string;
  tipo: string | null;
  ciudad: string | null;
  telefono: string | null;
  fase: Fase;
  excluido: boolean;
  proximo_seguimiento: string | null;
  created_at: string;
  asignada: { nombre: string; iniciales: string } | null;
}

const FASES_DESCARTE: readonly Fase[] = ["perdido", "no_interesa", "ilocalizable"];

const COLOR_SEGUIMIENTO = {
  atrasado: { bg: "#fee2e2", text: "#b91c1c" },
  hoy: { bg: "#fef3c7", text: "#92400e" },
  futuro: { bg: "#f1f5f9", text: "#64748b" },
} as const;

export function Tablero({
  slug,
  leads,
  hoy,
  filtrosLista,
}: {
  slug: string;
  leads: TarjetaLead[];
  hoy: string;
  filtrosLista: { mias: boolean; atrasados: boolean; q: string };
}) {
  // Mientras la acción está en marcha se enseña la fase nueva; al terminar manda
  // lo que devuelva el servidor: si falló, la tarjeta vuelve sola a su columna.
  const [visibles, moverEnPantalla] = useOptimistic(leads, (estado: TarjetaLead[], mov: { id: string; fase: Fase }) =>
    estado.map((l) => (l.id === mov.id ? { ...l, fase: mov.fase } : l)),
  );
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<ColumnaId | null>(null);
  const [descartando, setDescartando] = useState<TarjetaLead | null>(null);
  // Ids con un movimiento en marcha: evita que un doble clic o un segundo
  // arrastre disparen dos veces la misma acción (y cuenten dos muestras).
  const [enMarcha, setEnMarcha] = useState<ReadonlySet<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const focoTrasDescarte = useRef<HTMLElement | null>(null);

  const grupos = agruparEnColumnas(visibles);
  const origenArrastre = arrastrando ? visibles.find((l) => l.id === arrastrando) : undefined;

  function registrarRef(id: string, el: HTMLElement | null) {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }

  function mover(lead: TarjetaLead, fase: Fase) {
    if (lead.fase === fase || enMarcha.has(lead.id)) return;
    setAviso(null);
    setEnMarcha((s) => new Set(s).add(lead.id));
    startTransition(async () => {
      moverEnPantalla({ id: lead.id, fase });
      let res: ResultadoAccion;
      try {
        res = await moverLeadAction(slug, lead.id, fase);
      } catch {
        res = { ok: false, error: "No se pudo mover. Revisa la conexión y vuelve a intentarlo." };
      }
      setAviso(res.ok ? { ok: true, mensaje: `«${lead.negocio}» → ${FASE_LABELS[fase]}` } : { ok: false, error: `«${lead.negocio}» no se ha movido: ${res.error}` });
      setEnMarcha((s) => {
        if (!s.has(lead.id)) return s;
        const n = new Set(s);
        n.delete(lead.id);
        return n;
      });
    });
  }

  function abrirDescarte(lead: TarjetaLead) {
    focoTrasDescarte.current = cardRefs.current.get(lead.id) ?? null;
    setDescartando(lead);
  }

  function cerrarDescarte() {
    setDescartando(null);
    focoTrasDescarte.current?.focus();
    focoTrasDescarte.current = null;
  }

  function soltar(e: DragEvent, columna: ColumnaTablero) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || arrastrando;
    setSobre(null);
    setArrastrando(null);
    const lead = visibles.find((l) => l.id === id);
    if (!lead || columnaDeFase(lead.fase) === columna.id) return;
    if (columna.destino === null) abrirDescarte(lead);
    else mover(lead, columna.destino);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ minHeight: 20 }} aria-live="polite">
        <Mensaje resultado={aviso} />
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", alignItems: "flex-start", paddingBottom: 10 }}>
        {COLUMNAS_TABLERO.map((columna) => {
          const todas = ordenarPorUrgencia(grupos[columna.id], hoy);
          const destacada = sobre === columna.id;
          const aceptaSoltar = origenArrastre !== undefined && columnaDeFase(origenArrastre.fase) !== columna.id;
          const color = FASE_COLORES[columna.fases[0]];
          const ancho = columna.id === "descartados" ? 220 : 260;
          return (
            <section
              key={columna.id}
              aria-label={`${columna.titulo}: ${todas.length} leads`}
              onDragOver={(e) => {
                if (!aceptaSoltar) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (sobre !== columna.id) setSobre(columna.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre((s) => (s === columna.id ? null : s));
              }}
              onDrop={(e) => soltar(e, columna)}
              style={{
                flex: `0 0 ${ancho}px`,
                display: "flex",
                flexDirection: "column",
                borderRadius: 12,
                background: destacada ? "#eff6ff" : "#e9eef5",
                outline: destacada ? "2px solid #187bef" : aceptaSoltar ? "2px dashed #94a3b8" : "2px solid transparent",
                outlineOffset: -2,
                transition: "background 120ms, outline-color 120ms",
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: "12px 12px 0 0",
                  background: color.bg,
                  color: color.text,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{columna.titulo}</h2>
                <span style={{ minWidth: 24, textAlign: "center", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.7)", borderRadius: 999, padding: "1px 8px" }}>
                  {todas.length}
                </span>
              </header>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8, minHeight: 120, maxHeight: "calc(100vh - 290px)", overflowY: "auto" }}>
                {todas.length === 0 && (
                  <p style={{ margin: "18px 0", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                    {columna.destino === null ? "Suelta aquí para descartar" : "Sin leads"}
                  </p>
                )}
                {todas.slice(0, MAX_TARJETAS_COLUMNA).map((lead) => (
                  <Tarjeta
                    key={lead.id}
                    slug={slug}
                    lead={lead}
                    hoy={hoy}
                    arrastrandose={arrastrando === lead.id}
                    moviendo={enMarcha.has(lead.id)}
                    enDescartados={columna.destino === null}
                    onEmpezarArrastre={() => setArrastrando(lead.id)}
                    onTerminarArrastre={() => {
                      setArrastrando(null);
                      setSobre(null);
                    }}
                    onMover={(fase) => mover(lead, fase)}
                    onDescartar={() => abrirDescarte(lead)}
                    onRegistrarRef={(el) => registrarRef(lead.id, el)}
                  />
                ))}
                {todas.length > MAX_TARJETAS_COLUMNA && (
                  <VerEnLista slug={slug} columna={columna} leads={todas} filtros={filtrosLista} />
                )}
              </div>
            </section>
          );
        })}
      </div>

      {descartando && (
        <SelectorDescarte
          negocio={descartando.negocio}
          onElegir={(fase) => {
            const lead = descartando;
            cerrarDescarte();
            mover(lead, fase);
          }}
          onCancelar={cerrarDescarte}
        />
      )}
    </div>
  );
}

function Tarjeta({
  slug,
  lead,
  hoy,
  arrastrandose,
  moviendo,
  enDescartados,
  onEmpezarArrastre,
  onTerminarArrastre,
  onMover,
  onDescartar,
  onRegistrarRef,
}: {
  slug: string;
  lead: TarjetaLead;
  hoy: string;
  arrastrandose: boolean;
  moviendo: boolean;
  enDescartados: boolean;
  onEmpezarArrastre: () => void;
  onTerminarArrastre: () => void;
  onMover: (fase: Fase) => void;
  onDescartar: () => void;
  onRegistrarRef: (el: HTMLElement | null) => void;
}) {
  const router = useRouter();
  const ficha = `/panel/ventas/${slug}/leads/${lead.id}`;
  const siguiente = siguienteFase(lead.fase);
  const seguimiento = estadoSeguimiento(lead.proximo_seguimiento, lead.fase, hoy);
  const detalle = [lead.tipo, lead.ciudad].filter(Boolean).join(" · ");

  const abrir = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    router.push(ficha);
  };
  const teclado = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") router.push(ficha);
    if (e.key === "ArrowRight" && siguiente) {
      e.preventDefault();
      onMover(siguiente);
    }
  };

  return (
    <article
      ref={onRegistrarRef}
      tabIndex={0}
      draggable={!moviendo}
      aria-label={`${lead.negocio}, ${FASE_LABELS[lead.fase]}${moviendo ? ", moviendo…" : ""}. Intro abre la ficha${siguiente ? `; flecha derecha pasa a ${FASE_LABELS[siguiente]}` : ""}.`}
      aria-busy={moviendo}
      onDragStart={(e) => {
        if (moviendo) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onEmpezarArrastre();
      }}
      onDragEnd={onTerminarArrastre}
      onClick={abrir}
      onMouseEnter={() => router.prefetch(ficha)}
      onKeyDown={teclado}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${seguimiento ? COLOR_SEGUIMIENTO[seguimiento].text : "#e2e8f0"}`,
        borderRadius: 10,
        padding: "9px 10px",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        cursor: moviendo ? "wait" : "grab",
        opacity: arrastrandose ? 0.45 : moviendo ? 0.55 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14, color: "#0f172a", lineHeight: 1.25, overflowWrap: "anywhere" }}>{lead.negocio}</strong>
          {detalle && <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 2 }}>{detalle}</span>}
        </div>
        {lead.asignada && (
          <span
            title={`Asignada a ${lead.asignada.nombre}`}
            aria-label={`Asignada a ${lead.asignada.nombre}`}
            style={{
              flex: "0 0 26px",
              height: 26,
              borderRadius: "50%",
              background: "#187bef",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {lead.asignada.iniciales}
          </span>
        )}
      </div>

      {(lead.excluido || enDescartados || seguimiento) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {enDescartados && <FaseEtiqueta fase={lead.fase} />}
          {lead.excluido && (
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.4, color: "#b91c1c", background: "#fee2e2", borderRadius: 4, padding: "2px 6px" }}>EXCLUIDO</span>
          )}
          {seguimiento && lead.proximo_seguimiento && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 4,
                padding: "2px 6px",
                background: COLOR_SEGUIMIENTO[seguimiento].bg,
                color: COLOR_SEGUIMIENTO[seguimiento].text,
              }}
            >
              {seguimiento === "atrasado" ? `Atrasado · ${formatoFecha(lead.proximo_seguimiento)}` : seguimiento === "hoy" ? "Seguimiento hoy" : formatoFecha(lead.proximo_seguimiento)}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
        {lead.telefono && (
          <a href={`tel:${lead.telefono}`} aria-label={`Llamar a ${lead.negocio} (${lead.telefono})`} title={lead.telefono} style={botonTarjeta}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>
        )}
        {siguiente && (
          <button
            type="button"
            onClick={() => onMover(siguiente)}
            disabled={moviendo}
            aria-label={`Pasar ${lead.negocio} a ${FASE_LABELS[siguiente]}`}
            title={`Pasar a ${FASE_LABELS[siguiente]}`}
            style={{
              ...botonTarjeta,
              background: FASE_COLORES[siguiente].bg,
              color: FASE_COLORES[siguiente].text,
              borderColor: "transparent",
              fontWeight: 700,
              fontSize: 15,
              cursor: moviendo ? "not-allowed" : "pointer",
              opacity: moviendo ? 0.5 : 1,
            }}
          >
            →
          </button>
        )}
        <MenuAcciones negocio={lead.negocio} destinos={fasesDestino(lead.fase)} deshabilitado={moviendo} onMover={onMover} onDescartar={onDescartar} />
      </div>
    </article>
  );
}

function MenuAcciones({
  negocio,
  destinos,
  deshabilitado,
  onMover,
  onDescartar,
}: {
  negocio: string;
  destinos: Fase[];
  deshabilitado: boolean;
  onMover: (fase: Fase) => void;
  onDescartar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const clicFuera = (e: globalThis.MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    };
    document.addEventListener("mousedown", clicFuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", clicFuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  return (
    <div ref={raiz} style={{ position: "relative" }}>
      <button
        type="button"
        ref={boton}
        onClick={() => setAbierto((v) => !v)}
        disabled={deshabilitado}
        aria-label={`Más acciones de ${negocio}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        style={{ ...botonTarjeta, fontWeight: 700, letterSpacing: 1 }}
      >
        ⋯
      </button>
      {abierto && (
        <div
          role="menu"
          aria-label={`Acciones de ${negocio}`}
          style={{
            position: "absolute",
            right: 0,
            bottom: "calc(100% + 4px)",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)",
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 175,
            zIndex: 10,
          }}
        >
          {destinos.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "4px 8px 2px", textTransform: "uppercase" }}>Mover a…</span>
          )}
          {destinos.map((fase) => (
            <button
              key={fase}
              type="button"
              role="menuitem"
              onClick={() => {
                setAbierto(false);
                onMover(fase);
              }}
              style={itemMenu}
            >
              {FASE_LABELS[fase]}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              onDescartar();
            }}
            style={{ ...itemMenu, color: "#b91c1c" }}
          >
            Descartar…
          </button>
        </div>
      )}
    </div>
  );
}

const itemMenu: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 8px",
  border: "none",
  background: "transparent",
  borderRadius: 6,
  fontSize: 13,
  color: "#1e293b",
  cursor: "pointer",
};

const botonTarjeta: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 32,
  height: 28,
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  textDecoration: "none",
  lineHeight: 1,
};

function VerEnLista({
  slug,
  columna,
  leads,
  filtros,
}: {
  slug: string;
  columna: ColumnaTablero;
  leads: TarjetaLead[];
  filtros: { mias: boolean; atrasados: boolean; q: string };
}) {
  // La lista filtra por una sola fase: Descartados enlaza cada una por separado.
  const enlace = (fase: Fase) => {
    const p = new URLSearchParams({ fase });
    if (filtros.mias) p.set("mias", "1");
    if (filtros.atrasados) p.set("atrasados", "1");
    if (filtros.q) p.set("q", filtros.q);
    return `/panel/ventas/${slug}/leads?${p.toString()}`;
  };
  const estilo = { fontSize: 12, fontWeight: 600, color: "#187bef", textDecoration: "none" } as const;
  return (
    <p style={{ margin: "4px 2px", fontSize: 12, color: "#64748b", textAlign: "center" }}>
      Se ven {MAX_TARJETAS_COLUMNA} de {leads.length}.{" "}
      {columna.fases.length === 1 ? (
        <a href={enlace(columna.fases[0])} style={estilo}>Ver las {leads.length} en la lista</a>
      ) : (
        <>
          Ver en la lista:{" "}
          {columna.fases.map((f, i) => (
            <span key={f}>
              {i > 0 && " · "}
              <a href={enlace(f)} style={estilo}>{FASE_LABELS[f]} ({leads.filter((l) => l.fase === f).length})</a>
            </span>
          ))}
        </>
      )}
    </p>
  );
}

function SelectorDescarte({ negocio, onElegir, onCancelar }: { negocio: string; onElegir: (fase: Fase) => void; onCancelar: () => void }) {
  const primero = useRef<HTMLButtonElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    primero.current?.focus();
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancelar();
        return;
      }
      // Atrapa el foco dentro del diálogo: Tab/Mayús+Tab no deben escaparse a la página de detrás.
      if (e.key !== "Tab" || !contenedor.current) return;
      const focales = Array.from(contenedor.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (focales.length === 0) return;
      const primerBoton = focales[0];
      const ultimoBoton = focales[focales.length - 1];
      if (e.shiftKey && document.activeElement === primerBoton) {
        e.preventDefault();
        ultimoBoton.focus();
      } else if (!e.shiftKey && document.activeElement === ultimoBoton) {
        e.preventDefault();
        primerBoton.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCancelar]);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancelar()}
      style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
    >
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-descarte"
        style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", width: "100%", maxWidth: 340, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.25)", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <h2 id="titulo-descarte" style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
          ¿Por qué se descarta «{negocio}»?
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FASES_DESCARTE.map((fase, i) => (
            <button
              key={fase}
              ref={i === 0 ? primero : undefined}
              type="button"
              onClick={() => onElegir(fase)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: FASE_COLORES[fase].bg,
                color: FASE_COLORES[fase].text,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {FASE_LABELS[fase]}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancelar} style={{ ...botonSecundario, alignSelf: "flex-end" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
