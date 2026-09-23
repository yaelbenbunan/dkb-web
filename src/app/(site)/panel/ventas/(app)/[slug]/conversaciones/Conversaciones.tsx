"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
}

export interface MensajeHilo {
  id: string;
  direccion: Mensaje["direccion"];
  texto: string | null;
  estado: Mensaje["estado"];
  error: string | null;
  createdAt: string;
}

export interface Hilo {
  id: string;
  nombre: string;
  etiquetaVentana: string;
  ventanaAbierta: boolean;
  mensajes: MensajeHilo[];
}

/** Solo pinta: la lista de conversaciones y, si hay una abierta, su hilo
 *  completo con el campo de respuesta. Sin tiempo real: se refresca al
 *  navegar (cambiar de conversación) o al enviar un mensaje. */
export function Conversaciones({ slug, conversaciones, hilo }: { slug: string; conversaciones: TarjetaConversacion[]; hilo: Hilo | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: 16, alignItems: "start" }}>
      <section style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
        <ListaConversaciones slug={slug} conversaciones={conversaciones} activaId={hilo?.id ?? null} />
      </section>

      <section style={{ ...tarjeta, minHeight: 400, display: "flex", flexDirection: "column" }}>
        {hilo ? <HiloConversacion key={hilo.id} slug={slug} hilo={hilo} /> : <SinSeleccion vacio={conversaciones.length === 0} />}
      </section>
    </div>
  );
}

function ListaConversaciones({ slug, conversaciones, activaId }: { slug: string; conversaciones: TarjetaConversacion[]; activaId: string | null }) {
  if (conversaciones.length === 0) {
    return <p style={{ margin: 0, padding: 16, fontSize: 14, color: "#64748b" }}>Todavía no hay conversaciones.</p>;
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {conversaciones.map((c) => {
        const activa = c.id === activaId;
        return (
          <li key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <Link
              href={`/panel/ventas/${slug}/conversaciones?c=${c.id}`}
              style={{
                display: "block",
                padding: "10px 14px",
                textDecoration: "none",
                background: activa ? "#eff6ff" : "#fff",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{c.nombre}</div>
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

function SinSeleccion({ vacio }: { vacio: boolean }) {
  return (
    <p style={{ margin: "auto", fontSize: 14, color: "#64748b" }}>
      {vacio ? "Todavía no hay conversaciones." : "Elige una conversación de la lista."}
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
        <div style={{ fontSize: 11, color: "#64748b" }}>{formatoFechaHora(mensaje.createdAt)}</div>
        {mensaje.estado === "fallido" && (
          <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>No se pudo enviar{mensaje.error ? `: ${mensaje.error}` : "."}</div>
        )}
      </div>
    </div>
  );
}

function HiloConversacion({ slug, hilo }: { slug: string; hilo: Hilo }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    startTransition(async () => {
      const r = await responder(slug, hilo.id, texto);
      setResultado(r);
      if (r.ok) {
        setTexto("");
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{hilo.nombre}</h2>
        <span style={{ fontSize: 13, fontWeight: 600, color: hilo.ventanaAbierta ? "#16a34a" : "#b91c1c" }}>{hilo.etiquetaVentana}</span>
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
