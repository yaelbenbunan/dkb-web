"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FASES, FASE_LABELS, type Fase } from "@/lib/ventas/dominio";
import { VARIABLES_BASE, validarSecuencia, type Secuencia } from "@/lib/ventas/secuencias";
import {
  iniciarSimulacion,
  responderBoton,
  responderTexto,
  type ContextoSimulacion,
  type EstadoSimulacion,
} from "@/lib/ventas/simulador";
import { FaseEtiqueta } from "../../../../_componentes/FaseEtiqueta";
import { botonSecundario, campo, etiqueta, tarjeta, titulo } from "../../../../_componentes/estilos";

/** Valores de ejemplo razonables para las variables que no dependen de la marca ni de quien simula. */
const EJEMPLOS_POR_DEFECTO: Record<string, string> = {
  negocio: "Gimnasio Ejemplo",
  contacto: "Ana",
  ciudad: "Madrid",
};

function valoresIniciales(marcaNombre: string, usuariaNombre: string): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const variable of VARIABLES_BASE) {
    if (variable === "marca") valores[variable] = marcaNombre;
    else if (variable === "remitente") valores[variable] = usuariaNombre;
    else valores[variable] = EJEMPLOS_POR_DEFECTO[variable] ?? "";
  }
  return valores;
}

/**
 * Simulador de la conversación: burbujas al estilo WhatsApp (la marca a la
 * izquierda, el negocio a la derecha), con los botones del paso actual y un
 * campo de texto libre que demuestra que una respuesta que no es un botón
 * para la secuencia. No envía nada ni escribe en la base: usa el motor puro
 * de `@/lib/ventas/simulador` sobre el borrador que se está editando, sin
 * llamar al servidor.
 */
export function Simulador({ secuencia, marcaNombre, usuariaNombre }: { secuencia: Secuencia; marcaNombre: string; usuariaNombre: string }) {
  const [valores, setValores] = useState<Record<string, string>>(() => valoresIniciales(marcaNombre, usuariaNombre));
  const [faseInicial, setFaseInicial] = useState<Fase>("nuevo");
  const [texto, setTexto] = useState("");
  const ctx: ContextoSimulacion = useMemo(() => ({ valores, faseInicial }), [valores, faseInicial]);
  const [estado, setEstado] = useState<EstadoSimulacion>(() => iniciarSimulacion(secuencia, ctx));

  const gravesSecuencia = useMemo(() => validarSecuencia(secuencia).filter((a) => a.grave), [secuencia]);

  function empezarDeNuevo() {
    setEstado(iniciarSimulacion(secuencia, ctx));
  }

  function pulsarBoton(indice: number) {
    setEstado((actual) => responderBoton(secuencia, actual, indice, ctx));
  }

  function enviarTexto(e: FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    setEstado((actual) => responderTexto(actual, limpio));
    setTexto("");
  }

  const pasoActual = estado.pasoActual ? secuencia.pasos[estado.pasoActual] : null;
  const botonesActuales = !estado.terminada && pasoActual ? pasoActual.botones : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {gravesSecuencia.length > 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", background: "#fef2f2", borderRadius: 8, padding: "8px 12px" }}>
          Esta secuencia todavía tiene errores: la simulación puede pararse antes de lo esperado. Corrígelos en la pestaña «Editar».
        </p>
      )}

      <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ ...titulo, margin: 0 }}>Datos de ejemplo</h2>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Cámbialos para ver el mensaje tal y como lo leería un negocio real.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {VARIABLES_BASE.map((variable) => (
            <label key={variable} style={{ ...etiqueta, minWidth: 140 }}>
              {`{{${variable}}}`}
              <input value={valores[variable] ?? ""} onChange={(e) => setValores((v) => ({ ...v, [variable]: e.target.value }))} style={campo} />
            </label>
          ))}
          <label style={{ ...etiqueta, minWidth: 160 }}>
            Fase inicial del lead
            <select value={faseInicial} onChange={(e) => setFaseInicial(e.target.value as Fase)} style={campo}>
              {FASES.map((f) => (
                <option key={f} value={f}>{FASE_LABELS[f]}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <button type="button" onClick={empezarDeNuevo} style={botonSecundario}>Empezar de nuevo</button>
        </div>
      </section>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <section style={{ ...tarjeta, flex: "3 1 400px", minWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ ...titulo, margin: 0 }}>Conversación</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#e5ded6", borderRadius: 10, padding: 12, minHeight: 220 }}>
            {estado.conversacion.map((entrada, i) => (
              <div key={i} style={{ display: "flex", justifyContent: entrada.de === "negocio" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "80%",
                    background: entrada.de === "negocio" ? "#dcf8c6" : "#fff",
                    color: "#111b21",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
                  }}
                >
                  {entrada.texto}
                </div>
              </div>
            ))}
          </div>

          {botonesActuales.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {botonesActuales.map((boton, indice) => (
                <button key={indice} type="button" onClick={() => pulsarBoton(indice)} style={botonSecundario}>
                  {boton.texto || "(sin texto)"}
                </button>
              ))}
            </div>
          )}

          {estado.esperaDias !== null && !estado.terminada && (
            <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
              Aquí se esperarían {estado.esperaDias} día{estado.esperaDias === 1 ? "" : "s"} antes de seguir: todavía no hay envíos automáticos.
            </p>
          )}

          <form onSubmit={enviarTexto} style={{ display: "flex", gap: 8 }}>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe algo que no sea un botón…"
              disabled={estado.terminada}
              style={{ ...campo, flex: 1 }}
            />
            <button type="submit" disabled={estado.terminada || !texto.trim()} style={botonSecundario}>Enviar</button>
          </form>
          {estado.terminada && (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>La conversación ha terminado. Pulsa «Empezar de nuevo» para probarla otra vez.</p>
          )}
        </section>

        <section style={{ ...tarjeta, flex: "1 1 260px", minWidth: 240, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ ...titulo, margin: 0 }}>Qué pasaría con el lead</h2>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Fase</span>
            <div style={{ marginTop: 4 }}><FaseEtiqueta fase={estado.fase} /></div>
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Datos recogidos</span>
            {Object.keys(estado.datos).length === 0 ? (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Todavía ninguno.</p>
            ) : (
              <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(estado.datos).map(([clave, valor]) => (
                  <li key={clave} style={{ fontSize: 13, color: "#1e293b" }}><strong>{clave}:</strong> {valor}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Avisos de esta conversación</span>
            {estado.avisos.length === 0 ? (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Ninguno todavía.</p>
            ) : (
              <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {estado.avisos.map((a, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#92400e", background: "#fffbeb", borderRadius: 6, padding: "4px 8px" }}>{a}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Variables sin valor de ejemplo</span>
            {estado.faltanVariables.length === 0 ? (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Ninguna: todas tienen valor.</p>
            ) : (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#b91c1c" }}>{estado.faltanVariables.map((v) => `{{${v}}}`).join(", ")}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
