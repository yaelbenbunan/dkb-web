"use client";

import { useActionState, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { activarSecuenciaAction, guardarSecuenciaAction } from "../../../../acciones-secuencias";
import { FASES, FASE_LABELS, type Fase } from "@/lib/ventas/dominio";
import type { SecuenciaRow } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import {
  VARIABLES_BASE,
  siguientesPasos,
  validarSecuencia,
  type Boton,
  type Paso,
  type Ruta,
  type Secuencia,
} from "@/lib/ventas/secuencias";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "../../../../_componentes/estilos";

type EstadoSecuencia = SecuenciaRow["estado"];

const ESTADO_LABELS: Record<EstadoSecuencia, string> = { borrador: "Borrador", activa: "Activa", archivada: "Archivada" };
const ESTADO_COLORES: Record<EstadoSecuencia, { bg: string; text: string }> = {
  borrador: { bg: "#e2e8f0", text: "#334155" },
  activa: { bg: "#dcfce7", text: "#166534" },
  archivada: { bg: "#f1f5f9", text: "#64748b" },
};

/** Primeras palabras de un texto, para enseñarlo en listas y menús desplegables. */
function resumenTexto(texto: string, max = 36): string {
  const limpio = texto.trim();
  if (!limpio) return "(sin texto)";
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max).trimEnd()}…`;
}

/** Los pasos en el orden en que se recorrerían desde el inicio; los que no se
 *  alcanzan desde ningún sitio van al final, para que no se pierdan de vista. */
function ordenPasos(s: Secuencia): string[] {
  const vistos = new Set<string>();
  const orden: string[] = [];
  const cola: string[] = s.pasos[s.inicio] ? [s.inicio] : [];
  while (cola.length > 0) {
    const actual = cola.shift() as string;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    orden.push(actual);
    for (const destino of siguientesPasos(s, actual)) {
      if (!vistos.has(destino) && s.pasos[destino]) cola.push(destino);
    }
  }
  for (const id of Object.keys(s.pasos)) {
    if (!vistos.has(id)) orden.push(id);
  }
  return orden;
}

function idPasoNuevo(pasos: Record<string, Paso>): string {
  let n = 1;
  while (pasos[`p${n}`]) n += 1;
  return `p${n}`;
}

function EstadoEtiqueta({ estado }: { estado: EstadoSecuencia }) {
  const c = ESTADO_COLORES[estado];
  return (
    <span style={{ display: "inline-block", background: c.bg, color: c.text, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

const chipVariable: CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "monospace",
};

/** Editor de a dónde lleva un botón o un paso sin botones: reutilizado en los dos sitios. */
function RutaEditor({
  ruta,
  opciones,
  onChange,
  disabled,
}: {
  ruta: Ruta;
  opciones: { id: string; etiqueta: string }[];
  onChange: (r: Ruta) => void;
  disabled: boolean;
}) {
  function cambiar(cambios: Partial<Ruta>) {
    onChange({ ...ruta, ...cambios });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={etiqueta}>
        Llevar a
        <select
          value={ruta.ir_a ?? ""}
          disabled={disabled}
          onChange={(e) => cambiar({ ir_a: e.target.value || undefined, terminar: e.target.value ? false : ruta.terminar })}
          style={campo}
        >
          <option value="">— No cambia de paso —</option>
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>{o.etiqueta}</option>
          ))}
        </select>
      </label>
      <label style={etiqueta}>
        Cambiar la fase del lead a
        <select
          value={ruta.fase ?? ""}
          disabled={disabled}
          onChange={(e) => cambiar({ fase: (e.target.value || undefined) as Fase | undefined })}
          style={campo}
        >
          <option value="">— No cambiar de fase —</option>
          {FASES.map((f) => (
            <option key={f} value={f}>{FASE_LABELS[f]}</option>
          ))}
        </select>
      </label>
      <label style={etiqueta}>
        Esperar días antes de continuar
        <input
          type="number"
          min={1}
          max={90}
          disabled={disabled}
          value={ruta.esperar_dias ?? ""}
          onChange={(e) => cambiar({ esperar_dias: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Sin espera"
          style={campo}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
        <input type="checkbox" disabled={disabled} checked={!!ruta.avisar} onChange={(e) => cambiar({ avisar: e.target.checked })} />
        Avisar a la comercial
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={!!ruta.terminar}
          onChange={(e) => cambiar({ terminar: e.target.checked, ir_a: e.target.checked ? undefined : ruta.ir_a })}
        />
        Terminar la conversación
      </label>
    </div>
  );
}

export function EditorSecuencia({
  slug,
  secuenciaId,
  nombreInicial,
  estadoInicial,
  secuenciaInicial,
  editable,
}: {
  slug: string;
  secuenciaId: string;
  nombreInicial: string;
  estadoInicial: EstadoSecuencia;
  secuenciaInicial: Secuencia;
  editable: boolean;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [secuencia, setSecuencia] = useState<Secuencia>(secuenciaInicial);
  const [seleccionado, setSeleccionado] = useState<string>(secuenciaInicial.inicio);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [rGuardar, aGuardar, pGuardando] = useActionState<ResultadoAccion | null, FormData>(
    guardarSecuenciaAction.bind(null, slug, secuenciaId),
    null,
  );
  const [pActivando, startActivar] = useTransition();
  const [rActivar, setRActivar] = useState<ResultadoAccion | null>(null);

  const avisos = useMemo(() => validarSecuencia(secuencia), [secuencia]);
  const graves = avisos.filter((a) => a.grave);
  const orden = useMemo(() => ordenPasos(secuencia), [secuencia]);
  const opcionesRuta = useMemo(
    () => orden.map((id) => ({ id, etiqueta: `${id} — ${resumenTexto(secuencia.pasos[id]?.texto ?? "", 30)}` })),
    [orden, secuencia],
  );
  const pasoActual: Paso | undefined = secuencia.pasos[seleccionado];

  function actualizarPaso(id: string, cambios: Partial<Paso>) {
    setSecuencia((s) => (s.pasos[id] ? { ...s, pasos: { ...s.pasos, [id]: { ...s.pasos[id], ...cambios } } } : s));
  }

  function actualizarBoton(id: string, indice: number, cambios: Partial<Boton>) {
    setSecuencia((s) => {
      const paso = s.pasos[id];
      if (!paso) return s;
      const botones = paso.botones.map((b, i) => (i === indice ? { ...b, ...cambios } : b));
      return { ...s, pasos: { ...s.pasos, [id]: { ...paso, botones } } };
    });
  }

  function anadirBoton(id: string) {
    setSecuencia((s) => {
      const paso = s.pasos[id];
      if (!paso || paso.botones.length >= 3) return s;
      const nuevo: Boton = { texto: "", ruta: {} };
      return { ...s, pasos: { ...s.pasos, [id]: { ...paso, botones: [...paso.botones, nuevo] } } };
    });
  }

  function borrarBoton(id: string, indice: number) {
    setSecuencia((s) => {
      const paso = s.pasos[id];
      if (!paso) return s;
      return { ...s, pasos: { ...s.pasos, [id]: { ...paso, botones: paso.botones.filter((_, i) => i !== indice) } } };
    });
  }

  function anadirPaso() {
    setSecuencia((s) => {
      const id = idPasoNuevo(s.pasos);
      const nuevo: Paso = { tipo: "mensaje", texto: "", botones: [] };
      setSeleccionado(id);
      return { ...s, pasos: { ...s.pasos, [id]: nuevo } };
    });
  }

  function borrarPaso(id: string) {
    if (id === secuencia.inicio) return;
    setSecuencia((s) => {
      const pasos = { ...s.pasos };
      delete pasos[id];
      return { ...s, pasos };
    });
    setSeleccionado((actual) => (actual === id ? secuencia.inicio : actual));
  }

  function marcarInicio(id: string) {
    setSecuencia((s) => ({ ...s, inicio: id }));
  }

  function insertarVariable(nombreVariable: string) {
    if (!pasoActual) return;
    const textarea = textareaRef.current;
    const marcador = `{{${nombreVariable}}}`;
    if (textarea && document.activeElement === textarea) {
      const inicio = textarea.selectionStart ?? pasoActual.texto.length;
      const fin = textarea.selectionEnd ?? pasoActual.texto.length;
      const nuevoTexto = pasoActual.texto.slice(0, inicio) + marcador + pasoActual.texto.slice(fin);
      actualizarPaso(seleccionado, { texto: nuevoTexto });
      const posicion = inicio + marcador.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(posicion, posicion);
      });
    } else {
      actualizarPaso(seleccionado, { texto: pasoActual.texto + marcador });
    }
  }

  function activar() {
    setRActivar(null);
    startActivar(async () => {
      setRActivar(await activarSecuenciaAction(slug, secuenciaId));
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form action={aGuardar} style={{ ...tarjeta, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={!editable}
          required
          maxLength={120}
          style={{ ...campo, fontSize: 16, fontWeight: 700, minWidth: 220, flex: "1 1 220px" }}
        />
        <EstadoEtiqueta estado={estadoInicial} />
        <input type="hidden" name="pasos" value={JSON.stringify(secuencia)} readOnly />

        {editable && (
          <>
            <button type="submit" disabled={pGuardando} style={botonPrimario}>Guardar</button>
            <button
              type="button"
              onClick={activar}
              disabled={pActivando || graves.length > 0}
              title={graves.length > 0 ? "Corrige los errores en rojo antes de activar." : "Esta será la secuencia que se envíe."}
              style={{ ...botonSecundario, opacity: graves.length > 0 ? 0.6 : 1, cursor: graves.length > 0 ? "not-allowed" : "pointer" }}
            >
              Activar
            </button>
            {graves.length > 0 && (
              <span style={{ fontSize: 12, color: "#b91c1c" }}>
                Corrige {graves.length === 1 ? "el error" : `los ${graves.length} errores`} en rojo antes de activar.
              </span>
            )}
          </>
        )}
        <Mensaje resultado={rGuardar} />
        <Mensaje resultado={rActivar} />
      </form>

      {!editable && (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Solo puedes ver esta secuencia: pide a una admin que la edite, la active o la archive.
        </p>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <section style={{ ...tarjeta, flex: "1 1 260px", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ ...titulo, margin: 0 }}>Pasos</h2>
                {editable && (
                  <button type="button" onClick={anadirPaso} style={{ ...botonSecundario, padding: "4px 10px", fontSize: 13 }}>+ Añadir</button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {orden.map((id) => {
                  const paso = secuencia.pasos[id];
                  const avisosPaso = avisos.filter((a) => a.paso === id);
                  const grave = avisosPaso.some((a) => a.grave);
                  const marca = grave ? "#dc2626" : avisosPaso.length > 0 ? "#d97706" : seleccionado === id ? "#187bef" : "#e2e8f0";
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSeleccionado(id)}
                      style={{
                        textAlign: "left",
                        border: `1px solid ${seleccionado === id ? "#187bef" : "#e2e8f0"}`,
                        borderLeft: `4px solid ${marca}`,
                        borderRadius: 8,
                        padding: "8px 10px",
                        background: seleccionado === id ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                        {id}
                        {id === secuencia.inicio ? " · Inicio" : ""}
                        {paso.plantilla ? " · Plantilla" : ""}
                      </span>
                      <span style={{ fontSize: 13, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {resumenTexto(paso.texto)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {editable && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {seleccionado !== secuencia.inicio && (
                    <button type="button" onClick={() => marcarInicio(seleccionado)} style={{ ...botonSecundario, fontSize: 12, padding: "5px 8px" }}>
                      Marcar como inicio
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => borrarPaso(seleccionado)}
                    disabled={seleccionado === secuencia.inicio}
                    style={{
                      ...botonSecundario,
                      fontSize: 12,
                      padding: "5px 8px",
                      color: seleccionado === secuencia.inicio ? "#94a3b8" : "#b91c1c",
                      cursor: seleccionado === secuencia.inicio ? "not-allowed" : "pointer",
                    }}
                  >
                    Borrar este paso
                  </button>
                </div>
              )}
            </section>

            <section style={{ ...tarjeta, flex: "3 1 620px", minWidth: 300, display: "flex", flexDirection: "column", gap: 14 }}>
              {!pasoActual ? (
                <p style={{ margin: 0, color: "#64748b" }}>Elige un paso a la izquierda.</p>
              ) : (
                <>
                  <h2 style={{ ...titulo, margin: 0 }}>Paso «{seleccionado}»</h2>

                  <label style={etiqueta}>
                    Mensaje
                    <textarea
                      ref={textareaRef}
                      value={pasoActual.texto}
                      disabled={!editable}
                      maxLength={1024}
                      rows={5}
                      onChange={(e) => actualizarPaso(seleccionado, { texto: e.target.value })}
                      style={{ ...campo, resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
                    />
                  </label>

                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Variables disponibles (pulsa para insertarla):</span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {VARIABLES_BASE.map((v) => (
                        <button key={v} type="button" disabled={!editable} onClick={() => insertarVariable(v)} style={chipVariable}>
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155" }}>
                    <input
                      type="checkbox"
                      disabled={!editable}
                      checked={!!pasoActual.plantilla}
                      onChange={(e) => actualizarPaso(seleccionado, { plantilla: e.target.checked })}
                    />
                    Es una plantilla (el primer mensaje: necesita aprobación de Meta)
                  </label>

                  <label style={etiqueta}>
                    Guardar la respuesta en (opcional)
                    <input
                      value={pasoActual.guardar_respuesta_en ?? ""}
                      disabled={!editable}
                      placeholder="p. ej. direccion_muestras"
                      onChange={(e) => actualizarPaso(seleccionado, { guardar_respuesta_en: e.target.value || undefined })}
                      style={campo}
                    />
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
                      Así se guarda lo que responda el negocio: el texto del botón que pulse, o lo que escriba si este paso no tiene botones.
                    </span>
                  </label>

                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>Botones (hasta 3)</h3>
                      {editable && pasoActual.botones.length < 3 && (
                        <button type="button" onClick={() => anadirBoton(seleccionado)} style={{ ...botonSecundario, fontSize: 13, padding: "5px 10px" }}>
                          + Añadir botón
                        </button>
                      )}
                    </div>

                    {pasoActual.botones.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                          Este paso no tiene botones: dile qué pasa después de enviarlo, o la conversación se quedará parada.
                        </p>
                        <RutaEditor
                          ruta={pasoActual.ruta ?? {}}
                          opciones={opcionesRuta}
                          disabled={!editable}
                          onChange={(ruta) => actualizarPaso(seleccionado, { ruta })}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {pasoActual.botones.map((boton, indice) => (
                          <div key={indice} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                value={boton.texto}
                                disabled={!editable}
                                maxLength={20}
                                placeholder="Texto del botón (máx. 20 caracteres)"
                                onChange={(e) => actualizarBoton(seleccionado, indice, { texto: e.target.value })}
                                style={{ ...campo, flex: 1 }}
                              />
                              {editable && (
                                <button type="button" onClick={() => borrarBoton(seleccionado, indice)} style={{ ...botonSecundario, fontSize: 12, padding: "5px 8px", color: "#b91c1c" }}>
                                  Quitar
                                </button>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>Si pulsa este botón…</p>
                            <RutaEditor
                              ruta={boton.ruta}
                              opciones={opcionesRuta}
                              disabled={!editable}
                              onChange={(ruta) => actualizarBoton(seleccionado, indice, { ruta })}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          <section style={tarjeta}>
            <h2 style={titulo}>Avisos</h2>
            {avisos.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#166534" }}>Todo en orden: no hay avisos.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {avisos.map((aviso, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSeleccionado(aviso.paso)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 10px",
                        fontSize: 13,
                        cursor: "pointer",
                        background: aviso.grave ? "#fef2f2" : "#fffbeb",
                        color: aviso.grave ? "#b91c1c" : "#92400e",
                      }}
                    >
                      <strong>{aviso.grave ? "Hay que corregirlo: " : "Aviso: "}</strong>
                      {aviso.paso ? `Paso «${aviso.paso}». ` : ""}
                      {aviso.mensaje}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
    </div>
  );
}
