"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Mensaje } from "@/lib/whatsapp/db";
import { formatoFechaHora } from "@/lib/ventas/metricas";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje as MensajeResultado } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, tarjeta } from "../../../_componentes/estilos";
import { responder } from "./acciones";

export interface TarjetaConversacion {
  id: string;
  nombre: string;
  extracto: string;
  etiquetaVentana: string;
  ultimoMensajeAt: string;
  /** El cliente espera a una persona: se marca y va arriba. */
  esperaRespuesta: boolean;
}

export type Vista = "bandeja" | "archivadas";

export interface MensajeHilo {
  id: string;
  direccion: Mensaje["direccion"];
  texto: string | null;
  estado: Mensaje["estado"];
  error: string | null;
  /** Rótulos de los botones que se mandaron con el mensaje; vacío si no llevaba. */
  botones: string[];
  /** «Desde el móvil», «Importado», «Bot»; `null` si no lleva etiqueta. */
  origen: string | null;
  createdAt: string;
}

export interface Hilo {
  id: string;
  nombre: string;
  // `null` cuando todavía no hay lead vinculado (p.ej. alguien que escribe
  // antes de que la venta lo dé de alta): sin lead no hay ficha a la que
  // enlazar.
  leadId: string | null;
  etiquetaVentana: string;
  ventanaAbierta: boolean;
  mensajes: MensajeHilo[];
}

/** Solo pinta: la lista de conversaciones y, si hay una abierta, su hilo
 *  completo con el campo de respuesta. Se refresca sola cada 10 s mientras la
 *  pestaña está visible (y una vez al volver a ella), además de al navegar o
 *  al enviar un mensaje. */
export function Conversaciones({
  slug,
  conversaciones,
  hilo,
  conFicha,
  vista = "bandeja",
  totales,
}: {
  slug: string;
  conversaciones: TarjetaConversacion[];
  hilo: Hilo | null;
  /** «archivadas»: las de ventana cerrada. Vuelven a la bandeja cuando el cliente escribe. */
  vista?: Vista;
  totales?: { bandeja: number; archivadas: number };
  /** Si puede abrir la ficha del lead (la agente, no). */
  conFicha: boolean;
}) {
  const router = useRouter();
  // Lo marca el hilo mientras hay un envío en curso, para no refrescar encima.
  const enviandoRef = useRef(false);

  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible" && !enviandoRef.current) router.refresh();
    };
    const id = setInterval(refrescar, 10_000);
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [router]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: 16, alignItems: "start" }}>
      <section style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
        {totales && <PestanasVista slug={slug} vista={vista} totales={totales} />}
        <ListaConversaciones slug={slug} conversaciones={conversaciones} activaId={hilo?.id ?? null} vista={vista} />
      </section>

      <section style={{ ...tarjeta, minHeight: 400, display: "flex", flexDirection: "column" }}>
        {hilo ? <HiloConversacion key={hilo.id} slug={slug} hilo={hilo} conFicha={conFicha} enviandoRef={enviandoRef} /> : <SinSeleccion vacio={conversaciones.length === 0} vista={vista} />}
      </section>
    </div>
  );
}

/** Enlace a la lista, manteniendo la pestaña (sin `vista` es la bandeja). */
function hrefLista(slug: string, vista: Vista, conversacionId?: string): string {
  const qs = new URLSearchParams();
  if (vista === "archivadas") qs.set("vista", "archivadas");
  if (conversacionId) qs.set("c", conversacionId);
  const q = qs.toString();
  return `/panel/ventas/${slug}/conversaciones${q ? `?${q}` : ""}`;
}

function PestanasVista({ slug, vista, totales }: { slug: string; vista: Vista; totales: { bandeja: number; archivadas: number } }) {
  const pestana = (v: Vista, texto: string) => {
    const activa = v === vista;
    return (
      <Link
        href={hrefLista(slug, v)}
        aria-current={activa ? "page" : undefined}
        style={{
          flex: 1,
          textAlign: "center",
          padding: "10px 8px",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
          color: activa ? "#1d4ed8" : "#64748b",
          borderBottom: activa ? "2px solid #1d4ed8" : "2px solid transparent",
        }}
      >
        {texto}
      </Link>
    );
  };
  return (
    <nav style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
      {pestana("bandeja", `Bandeja (${totales.bandeja})`)}
      {pestana("archivadas", `Archivadas (${totales.archivadas})`)}
    </nav>
  );
}

function ListaConversaciones({ slug, conversaciones, activaId, vista }: { slug: string; conversaciones: TarjetaConversacion[]; activaId: string | null; vista: Vista }) {
  if (conversaciones.length === 0) {
    return (
      <p style={{ margin: 0, padding: 16, fontSize: 14, color: "#64748b" }}>
        {vista === "archivadas" ? "No hay conversaciones archivadas." : "No hay conversaciones abiertas. Las de ventana cerrada están en Archivadas."}
      </p>
    );
  }
  const esperando = conversaciones.filter((c) => c.esperaRespuesta).length;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {esperando > 0 && (
        <li style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#92400e", background: "#fffbeb", borderBottom: "1px solid #fde68a" }}>
          {esperando === 1 ? "1 espera respuesta" : `${esperando} esperan respuesta`}
        </li>
      )}
      {conversaciones.map((c) => {
        const activa = c.id === activaId;
        return (
          <li key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <Link
              href={hrefLista(slug, vista, c.id)}
              style={{
                display: "block",
                padding: "10px 14px",
                textDecoration: "none",
                background: activa ? "#eff6ff" : "#fff",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{c.nombre}</div>
              {c.esperaRespuesta && (
                <span style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #f59e0b" }}>
                  Espera respuesta
                </span>
              )}
              <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{c.extracto}</div>
              <div style={{ fontSize: 12, color: c.etiquetaVentana.startsWith("Abierta") ? "#16a34a" : "#b91c1c", marginTop: 4, fontWeight: 600 }}>
                {c.etiquetaVentana}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SinSeleccion({ vacio, vista }: { vacio: boolean; vista: Vista }) {
  return (
    <p style={{ margin: "auto", fontSize: 14, color: "#64748b" }}>
      {vacio ? (vista === "archivadas" ? "No hay conversaciones archivadas." : "No hay conversaciones abiertas.") : "Elige una conversación de la lista."}
    </p>
  );
}

function BurbujaMensaje({ mensaje }: { mensaje: MensajeHilo }) {
  const saliente = mensaje.direccion === "saliente";
  return (
    <div style={{ display: "flex", justifyContent: saliente ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "70%",
          background: saliente ? "#dbeafe" : "#f1f5f9",
          borderRadius: 10,
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 14, color: "#0f172a", whiteSpace: "pre-wrap" }}>{mensaje.texto ?? "(sin texto)"}</div>
        {mensaje.botones.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {mensaje.botones.map((boton) => (
              <span
                key={boton}
                style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", background: "#fff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "3px 10px" }}
              >
                {boton}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {formatoFechaHora(mensaje.createdAt)}
          {mensaje.origen && ` · ${mensaje.origen}`}
        </div>
        {mensaje.estado === "fallido" && (
          <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>No se pudo enviar{mensaje.error ? `: ${mensaje.error}` : "."}</div>
        )}
      </div>
    </div>
  );
}

function HiloConversacion({ slug, hilo, conFicha, enviandoRef }: { slug: string; hilo: Hilo; conFicha: boolean; enviandoRef: { current: boolean } }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    enviandoRef.current = true;
    startTransition(async () => {
      try {
        const r = await responder(slug, hilo.id, texto);
        setResultado(r);
        if (r.ok) {
          setTexto("");
          router.refresh();
        }
      } catch {
        setResultado({ ok: false, error: "No se pudo enviar. Vuelve a intentarlo." });
      } finally {
        enviandoRef.current = false;
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{hilo.nombre}</h2>
        <span style={{ fontSize: 13, fontWeight: 600, color: hilo.ventanaAbierta ? "#16a34a" : "#b91c1c" }}>{hilo.etiquetaVentana}</span>
        {conFicha && hilo.leadId && (
          <Link
            href={`/panel/ventas/${slug}/leads/${hilo.leadId}`}
            style={{ fontSize: 13, fontWeight: 600, color: "#187bef", textDecoration: "none" }}
          >
            Ver ficha del lead →
          </Link>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto", padding: "4px 2px" }}>
        {hilo.mensajes.length === 0 ? (
          <p style={{ margin: "auto", fontSize: 14, color: "#64748b" }}>Todavía no hay mensajes.</p>
        ) : (
          hilo.mensajes.map((m) => <BurbujaMensaje key={m.id} mensaje={m} />)
        )}
      </div>

      <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
        {!hilo.ventanaAbierta && (
          <p style={{ margin: 0, fontSize: 13, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px" }}>
            La ventana de 24 h está cerrada: hace falta una plantilla aprobada para volver a escribir.
          </p>
        )}
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={!hilo.ventanaAbierta || pendiente}
          maxLength={1024}
          rows={2}
          placeholder="Escribe una respuesta…"
          style={{ ...campo, resize: "vertical", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="submit" disabled={!hilo.ventanaAbierta || pendiente || !texto.trim()} style={botonPrimario}>
            {pendiente ? "Enviando…" : "Enviar"}
          </button>
          <MensajeResultado resultado={resultado} />
        </div>
      </form>
    </div>
  );
}
