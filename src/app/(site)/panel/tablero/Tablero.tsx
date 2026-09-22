"use client";

import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AM_COLORS } from "@/lib/account-managers";
import { STATUS_COLORS, statusLabel, type LeadStatus } from "@/lib/lead-status";
import type { ResultadoAccion } from "@/lib/panel-resultado";
import {
  COLUMNAS_TABLERO,
  MAX_TARJETAS_COLUMNA,
  agruparEnColumnas,
  calcularPosicionMenu,
  columnaDeEstado,
  estadoSeguimiento,
  estadosDestino,
  iniciales,
  ordenarPorUrgencia,
  siguienteColumna,
  type ColumnaId,
  type ColumnaTablero,
} from "@/lib/panel-tablero";
import { formatoFecha } from "@/lib/ventas/metricas";
import { moverLeadEstadoAction } from "../actions";
import { Mensaje } from "../_componentes/Mensaje";
import { botonSecundario } from "../_componentes/estilos";

/**
 * z-index del menú «⋯»: por encima de la cabecera fija del panel (10 en
 * PanelShell) y por debajo del selector de estado (50). El menú se porta a
 * `portalRef` (un nodo dentro del propio tablero, no `document.body`):
 * PanelShell envuelve el panel en un `position: fixed` con z-index altísimo
 * para tapar el sitio público, así que un portal fuera de ese árbol quedaría
 * él mismo detrás de la cabecera (o encima de todo, incluido el diálogo).
 * Portar dentro del tablero evita el recorte de las columnas con scroll y
 * mantiene el orden cabecera < menú < diálogo. Copiado del tablero de ventas.
 */
const Z_MENU = 30;
/** Por debajo de este ancho, el menú se enseña como hoja inferior. */
const ANCHO_HOJA = 640;

/** Colores del encabezado de cada columna. Deliberadamente aparte de
 *  `STATUS_COLORS` (que son sólidos, pensados para insignias con texto
 *  blanco): aquí hace falta un tono pastel de fondo con texto oscuro. */
const COLOR_COLUMNA: Record<ColumnaId, { bg: string; text: string }> = {
  nuevo: { bg: "#e2e8f0", text: "#334155" },
  contactado: { bg: "#dbeafe", text: "#1e40af" },
  propuesta: { bg: "#fef3c7", text: "#92400e" },
  ganado: { bg: "#dcfce7", text: "#166534" },
  descartados: { bg: "#fee2e2", text: "#991b1b" },
};

const COLOR_SEGUIMIENTO = {
  atrasado: { bg: "#fee2e2", text: "#b91c1c" },
  hoy: { bg: "#fef3c7", text: "#92400e" },
  futuro: { bg: "#f1f5f9", text: "#64748b" },
} as const;

/** Lo único que el tablero sabe de un lead: datos planos, tal cual vienen de `imagina_leads`. */
export interface TarjetaLead {
  id: string;
  estado: LeadStatus;
  name: string | null;
  phone: string | null;
  email: string | null;
  channel: string | null;
  campaign: string | null;
  notes: string | null;
  followup: string | null;
  followup_at: string | null;
  account_manager: string | null;
  created_at: string;
}

export function Tablero({
  leads,
  hoy,
  filtrosLista,
}: {
  leads: TarjetaLead[];
  hoy: string;
  filtrosLista: { atrasados: boolean; q: string };
}) {
  // Mientras la acción está en marcha se enseña el estado nuevo; al terminar
  // manda lo que devuelva el servidor: si falló, la tarjeta vuelve sola a su columna.
  const [visibles, moverEnPantalla] = useOptimistic(leads, (estado: TarjetaLead[], mov: { id: string; estado: LeadStatus }) =>
    estado.map((l) => (l.id === mov.id ? { ...l, estado: mov.estado } : l)),
  );
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<ColumnaId | null>(null);
  const [eligiendo, setEligiendo] = useState<{ lead: TarjetaLead; columna: ColumnaTablero } | null>(null);
  // Ids con un movimiento en marcha: evita que un doble clic o un segundo
  // arrastre disparen dos veces la misma acción (y cuenten dos muestras).
  const [enMarcha, setEnMarcha] = useState<ReadonlySet<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const focoTrasElegir = useRef<HTMLElement | null>(null);
  // Destino del portal del menú «⋯»: un nodo del propio tablero (sin scroll
  // ni recorte), no document.body — ver el porqué junto a Z_MENU más arriba.
  const portalRef = useRef<HTMLDivElement>(null);

  const grupos = agruparEnColumnas(visibles);
  const origenArrastre = arrastrando ? visibles.find((l) => l.id === arrastrando) : undefined;

  function registrarRef(id: string, el: HTMLElement | null) {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }

  function mover(lead: TarjetaLead, estadoDestino: LeadStatus) {
    if (lead.estado === estadoDestino || enMarcha.has(lead.id)) return;
    setAviso(null);
    setEnMarcha((s) => new Set(s).add(lead.id));
    startTransition(async () => {
      moverEnPantalla({ id: lead.id, estado: estadoDestino });
      let res: ResultadoAccion;
      try {
        res = await moverLeadEstadoAction(lead.id, estadoDestino);
      } catch {
        res = { ok: false, error: "No se pudo mover. Revisa la conexión y vuelve a intentarlo." };
      }
      const nombre = lead.name?.trim() || "El lead";
      setAviso(res.ok ? { ok: true, mensaje: `${nombre} → ${statusLabel(estadoDestino)}` } : { ok: false, error: `${nombre} no se ha movido: ${res.error}` });
      setEnMarcha((s) => {
        if (!s.has(lead.id)) return s;
        const n = new Set(s);
        n.delete(lead.id);
        return n;
      });
    });
  }

  function abrirElegir(lead: TarjetaLead, columna: ColumnaTablero) {
    focoTrasElegir.current = cardRefs.current.get(lead.id) ?? null;
    setEligiendo({ lead, columna });
  }

  function cerrarElegir() {
    setEligiendo(null);
    focoTrasElegir.current?.focus();
    focoTrasElegir.current = null;
  }

  function soltar(e: DragEvent, columna: ColumnaTablero) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || arrastrando;
    setSobre(null);
    setArrastrando(null);
    const lead = visibles.find((l) => l.id === id);
    if (!lead || columnaDeEstado(lead.estado) === columna.id) return;
    if (columna.destino === null) abrirElegir(lead, columna);
    else mover(lead, columna.destino);
  }

  return (
    <div ref={portalRef} style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
      <div style={{ minHeight: 20, flexShrink: 0 }} aria-live="polite">
        <Mensaje resultado={aviso} />
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", alignItems: "stretch", paddingBottom: 10, flex: 1, minHeight: 0 }}>
        {COLUMNAS_TABLERO.map((columna) => {
          const todas = ordenarPorUrgencia(grupos[columna.id], hoy);
          const destacada = sobre === columna.id;
          const aceptaSoltar = origenArrastre !== undefined && columnaDeEstado(origenArrastre.estado) !== columna.id;
          const color = COLOR_COLUMNA[columna.id];
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
                minHeight: 0,
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
                  flexShrink: 0,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{columna.titulo}</h2>
                <span style={{ minWidth: 24, textAlign: "center", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.7)", borderRadius: 999, padding: "1px 8px" }}>
                  {todas.length}
                </span>
              </header>

              {/* Lista de tarjetas con su propio scroll (flex: 1 + min-height:
                  0 + overflow-y: auto): así la columna llena el alto que le da
                  el flex de arriba y, al desbordar, no crece la página entera. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8, flex: 1, minHeight: 0, overflowY: "auto" }}>
                {todas.length === 0 && (
                  <p style={{ margin: "18px 0", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>Sin leads</p>
                )}
                {todas.slice(0, MAX_TARJETAS_COLUMNA).map((lead) => (
                  <Tarjeta
                    key={lead.id}
                    lead={lead}
                    hoy={hoy}
                    arrastrandose={arrastrando === lead.id}
                    moviendo={enMarcha.has(lead.id)}
                    onEmpezarArrastre={() => setArrastrando(lead.id)}
                    onTerminarArrastre={() => {
                      setArrastrando(null);
                      setSobre(null);
                    }}
                    onMover={(estadoDestino) => mover(lead, estadoDestino)}
                    onRegistrarRef={(el) => registrarRef(lead.id, el)}
                    portalRef={portalRef}
                  />
                ))}
                {todas.length > MAX_TARJETAS_COLUMNA && (
                  <p style={{ margin: "4px 2px", fontSize: 12, color: "#64748b", textAlign: "center" }}>
                    Se ven {MAX_TARJETAS_COLUMNA} de {todas.length}.{" "}
                    <a href="/panel" style={{ fontSize: 12, fontWeight: 600, color: "#187bef", textDecoration: "none" }}>
                      Ver todos en la lista
                    </a>
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {eligiendo && (
        <SelectorEstado
          nombre={eligiendo.lead.name?.trim() || "el lead"}
          titulo={eligiendo.columna.titulo}
          opciones={eligiendo.columna.estados}
          onElegir={(estadoDestino) => {
            const lead = eligiendo.lead;
            cerrarElegir();
            mover(lead, estadoDestino);
          }}
          onCancelar={cerrarElegir}
        />
      )}
    </div>
  );
}

function Tarjeta({
  lead,
  hoy,
  arrastrandose,
  moviendo,
  onEmpezarArrastre,
  onTerminarArrastre,
  onMover,
  onRegistrarRef,
  portalRef,
}: {
  lead: TarjetaLead;
  hoy: string;
  arrastrandose: boolean;
  moviendo: boolean;
  onEmpezarArrastre: () => void;
  onTerminarArrastre: () => void;
  onMover: (estado: LeadStatus) => void;
  onRegistrarRef: (el: HTMLElement | null) => void;
  portalRef: RefObject<HTMLDivElement | null>;
}) {
  const [expandida, setExpandida] = useState(false);
  const siguiente = siguienteColumna(lead.estado);
  const seguimiento = estadoSeguimiento(lead.followup_at, lead.estado, hoy);
  const nombre = lead.name?.trim() || "(sin nombre)";
  const detalle = [lead.channel, lead.campaign].filter(Boolean).join(" · ");
  const colorEstado = STATUS_COLORS[lead.estado] ?? "#64748b";

  const alternar = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    setExpandida((v) => !v);
  };
  const teclado = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") setExpandida((v) => !v);
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
      aria-label={`${nombre}, ${statusLabel(lead.estado)}${moviendo ? ", moviendo…" : ""}. Intro despliega sus notas${siguiente ? `; flecha derecha pasa a ${statusLabel(siguiente)}` : ""}.`}
      aria-busy={moviendo}
      aria-expanded={expandida}
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
      onClick={alternar}
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
          <strong style={{ display: "block", fontSize: 14, color: "#0f172a", lineHeight: 1.25, overflowWrap: "anywhere" }}>{nombre}</strong>
          {detalle && <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 2 }}>{detalle}</span>}
        </div>
        {lead.account_manager && (
          <span
            title={`Asignado a ${lead.account_manager}`}
            aria-label={`Asignado a ${lead.account_manager}`}
            style={{
              flex: "0 0 26px",
              height: 26,
              borderRadius: "50%",
              background: AM_COLORS[lead.account_manager] ?? "#187bef",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {iniciales(lead.account_manager)}
          </span>
        )}
      </div>

      {(lead.phone || lead.email) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ color: "#187bef", textDecoration: "none", fontWeight: 600 }}>
              📞 {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} style={{ color: "#64748b", textDecoration: "none", overflowWrap: "anywhere" }}>
              ✉ {lead.email}
            </a>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, borderRadius: 4, padding: "2px 6px", background: colorEstado, color: "#fff" }}>
          {statusLabel(lead.estado)}
        </span>
        {seguimiento && lead.followup_at && (
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
            {seguimiento === "atrasado" ? `Atrasado · ${formatoFecha(lead.followup_at)}` : seguimiento === "hoy" ? "Seguimiento hoy" : formatoFecha(lead.followup_at)}
          </span>
        )}
      </div>

      {expandida && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#334155", background: "#f8fafc", borderRadius: 8, padding: "8px 9px" }}>
          <div>
            <strong style={{ color: "#64748b", fontWeight: 700 }}>Notas: </strong>
            {lead.notes?.trim() || "—"}
          </div>
          <div>
            <strong style={{ color: "#64748b", fontWeight: 700 }}>Seguimiento: </strong>
            {lead.followup?.trim() || "—"}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
        {siguiente && (
          <button
            type="button"
            onClick={() => onMover(siguiente)}
            disabled={moviendo}
            aria-label={`Pasar ${nombre} a ${statusLabel(siguiente)}`}
            title={`Pasar a ${statusLabel(siguiente)}`}
            style={{
              ...botonTarjeta,
              background: STATUS_COLORS[siguiente] ?? "#187bef",
              color: "#fff",
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
        <MenuAcciones nombre={nombre} actual={lead.estado} deshabilitado={moviendo} onMover={onMover} portalRef={portalRef} />
      </div>
    </article>
  );
}

function MenuAcciones({
  nombre,
  actual,
  deshabilitado,
  onMover,
  portalRef,
}: {
  nombre: string;
  actual: LeadStatus;
  deshabilitado: boolean;
  onMover: (estado: LeadStatus) => void;
  portalRef: RefObject<HTMLDivElement | null>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [modoHoja, setModoHoja] = useState(false);
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Momento de apertura: al abrir, el propio gesto (el tap, o el navegador
  // llevando el botón a la vista) puede disparar un scroll que no debe
  // confundirse con que el usuario se ha ido a otra parte de la página.
  const aperturaTs = useRef(0);

  function abrir() {
    setModoHoja(window.innerWidth < ANCHO_HOJA);
    setPosicion(null);
    aperturaTs.current = Date.now();
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setPosicion(null);
  }

  function posicionar() {
    if (!boton.current || !menuRef.current) return null;
    const cabecera = document.querySelector("header");
    const limiteSuperior = cabecera ? cabecera.getBoundingClientRect().bottom : 0;
    const rectBoton = boton.current.getBoundingClientRect();
    return {
      rectBoton,
      limiteSuperior,
      pos: calcularPosicionMenu(
        rectBoton,
        { width: menuRef.current.offsetWidth, height: menuRef.current.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        limiteSuperior,
      ),
    };
  }

  // Sitúa el menú (modo escritorio) con el botón ya medido: primero se monta
  // oculto para poder medirlo con getBoundingClientRect, luego se calcula su
  // sitio con calcularPosicionMenu y se hace visible ya en su lugar.
  useLayoutEffect(() => {
    if (!abierto || modoHoja) return;
    const r = posicionar();
    if (r) setPosicion(r.pos);
  }, [abierto, modoHoja]);

  // Clic fuera y Escape: para las dos variantes.
  useEffect(() => {
    if (!abierto) return;
    const clicFuera = (e: globalThis.MouseEvent) => {
      const dentro = raiz.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node);
      if (!dentro) cerrar();
    };
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      cerrar();
      boton.current?.focus();
    };
    document.addEventListener("mousedown", clicFuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", clicFuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  // Solo en modo escritorio: un menú de posición fija se despega de su
  // tarjeta en cuanto algo se desplaza (la columna, la fila o la ventana),
  // así que se recalcula sobre la marcha en vez de cerrarse. La hoja móvil
  // no necesita nada de esto: está anclada al fondo de la pantalla.
  useEffect(() => {
    if (!abierto || modoHoja) return;
    let frame: number | null = null;
    const recalcular = () => {
      frame = null;
      // Ignora el scroll del propio gesto de apertura (el tap, o el navegador
      // llevando el botón a la vista): si no, el menú se cerraría solo nada
      // más abrirse.
      if (Date.now() - aperturaTs.current < 150) return;
      const r = posicionar();
      if (!r) return;
      const fueraDeVista =
        r.rectBoton.bottom < r.limiteSuperior ||
        r.rectBoton.top > window.innerHeight ||
        r.rectBoton.right < 0 ||
        r.rectBoton.left > window.innerWidth;
      if (fueraDeVista) cerrar();
      else setPosicion(r.pos);
    };
    const alDesplazar = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(recalcular);
    };
    window.addEventListener("scroll", alDesplazar, true);
    window.addEventListener("resize", alDesplazar);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", alDesplazar, true);
      window.removeEventListener("resize", alDesplazar);
    };
  }, [abierto, modoHoja]);

  const items = estadosDestino(actual).map((estado) => (
    <button
      key={estado}
      type="button"
      role="menuitem"
      onClick={() => {
        cerrar();
        onMover(estado);
      }}
      style={{ ...itemMenu, color: estado === "ilocalizable" || estado === "perdido" ? "#b91c1c" : "#1e293b" }}
    >
      {statusLabel(estado)}
    </button>
  ));

  const destino = portalRef.current;

  return (
    <div ref={raiz} style={{ position: "relative" }}>
      <button
        type="button"
        ref={boton}
        onClick={() => (abierto ? cerrar() : abrir())}
        disabled={deshabilitado}
        aria-label={`Más acciones de ${nombre}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        style={{ ...botonTarjeta, fontWeight: 700, letterSpacing: 1 }}
      >
        ⋯
      </button>

      {abierto && !modoHoja && destino &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Acciones de ${nombre}`}
            style={{
              position: "fixed",
              top: posicion?.top ?? 0,
              left: posicion?.left ?? 0,
              visibility: posicion ? "visible" : "hidden",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)",
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: 200,
              maxHeight: "min(70vh, 420px)",
              overflowY: "auto",
              zIndex: Z_MENU,
            }}
          >
            {items}
          </div>,
          destino,
        )}

      {abierto && modoHoja && destino &&
        createPortal(
          <>
            <div onClick={cerrar} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.35)", zIndex: Z_MENU }} />
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Acciones de ${nombre}`}
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: Z_MENU + 1,
                background: "#fff",
                borderRadius: "14px 14px 0 0",
                boxShadow: "0 -8px 24px rgba(15, 23, 42, 0.25)",
                padding: "14px 14px calc(env(safe-area-inset-bottom, 0px) + 14px)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: "70vh",
                overflowY: "auto",
              }}
            >
              <strong style={{ fontSize: 15, color: "#0f172a", padding: "2px 4px 10px" }}>{nombre}</strong>
              {items}
              <button type="button" onClick={cerrar} style={{ ...itemMenu, marginTop: 4, textAlign: "center", fontWeight: 700 }}>
                Cancelar
              </button>
            </div>
          </>,
          destino,
        )}
    </div>
  );
}

/** Diálogo para elegir el estado exacto al soltar una tarjeta en una columna
 *  con varios estados (Contactado, Kit Digital o Descartados). Copiado del
 *  `SelectorDescarte` del tablero de ventas. */
function SelectorEstado({
  nombre,
  titulo,
  opciones,
  onElegir,
  onCancelar,
}: {
  nombre: string;
  titulo: string;
  opciones: readonly LeadStatus[];
  onElegir: (estado: LeadStatus) => void;
  onCancelar: () => void;
}) {
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
        aria-labelledby="titulo-elegir-estado"
        style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", width: "100%", maxWidth: 340, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.25)", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <h2 id="titulo-elegir-estado" style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
          «{nombre}» a {titulo}: ¿cuál de los dos?
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {opciones.map((estado, i) => (
            <button
              key={estado}
              ref={i === 0 ? primero : undefined}
              type="button"
              onClick={() => onElegir(estado)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: STATUS_COLORS[estado] ?? "#334155",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {statusLabel(estado)}
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

const itemMenu: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 8px",
  border: "none",
  background: "transparent",
  borderRadius: 6,
  fontSize: 13,
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
