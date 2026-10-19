"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { consentimientoVigente, fechaLarga, GUION_LLAMADA } from "@/lib/prospeccion/consentimiento";
import { FILTROS_VACIOS, filtrarProspectos, type FiltrosProspectos } from "@/lib/prospeccion/filtros";
import {
  ESTADOS_DESCARTABLES,
  ESTADOS_PROSPECTO,
  type EstadoProspecto,
  type ProspectRow,
  type ProspectSearchRow,
  type ProspectTemplateRow,
} from "@/lib/prospeccion/tipos";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, td, th } from "../../../_componentes/estilos";
import {
  buscarEmailWebAction,
  descartarAction,
  enviarAction,
  marcarRespondidoAction,
  pasarAlEmbudoAction,
  registrarConsentimientoAction,
  retirarConsentimientoAction,
} from "../../../acciones-prospeccion";
import type { Aviso } from "./Prospeccion";
import { VistaPrevia } from "./VistaPrevia";

const ESTADO: Record<EstadoProspecto, { texto: string; bg: string; color: string }> = {
  nuevo: { texto: "Por llamar", bg: "#e2e8f0", color: "#334155" },
  listo: { texto: "Listo", bg: "#dbeafe", color: "#1e40af" },
  sin_contacto: { texto: "Sin email", bg: "#f1f5f9", color: "#64748b" },
  enviado: { texto: "Enviado", bg: "#dcfce7", color: "#166534" },
  respondido: { texto: "Respondió", bg: "#ede9fe", color: "#5b21b6" },
  rebotado: { texto: "Rebotó", bg: "#fee2e2", color: "#b91c1c" },
  baja: { texto: "Baja", bg: "#fee2e2", color: "#b91c1c" },
  descartado: { texto: "Descartado", bg: "#f1f5f9", color: "#94a3b8" },
};

/** Desde dónde se puede registrar que aceptó recibir información (igual que en el servidor). */
const ESTADOS_PARA_CONSENTIR: EstadoProspecto[] = ["nuevo", "sin_contacto", "listo", "descartado"];

function urlSegura(web: string | null): string | null {
  return web && /^https?:\/\//i.test(web) ? web : null;
}

/** `tel:` solo con dígitos y un `+` inicial: lo que venga de la fuente no entra tal cual en el enlace. */
function enlaceTelefono(tel: string | null): string | null {
  const limpio = (tel ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return limpio.replace(/\D/g, "").length >= 9 ? `tel:${limpio}` : null;
}

export function TablaProspectos({
  slug,
  prospectos,
  enlaces,
  busquedas,
  plantillas,
  remitentes,
  nombres,
  cupo,
  onAviso,
}: {
  slug: string;
  prospectos: ProspectRow[];
  /** `lead_id` → id del lead de ventas (los viejos apuntan a `imagina_leads`). */
  enlaces: Record<string, string>;
  busquedas: ProspectSearchRow[];
  plantillas: ProspectTemplateRow[];
  remitentes: string[];
  /** Id de usuaria de ventas → nombre. */
  nombres: Record<string, string>;
  /** Correos que aún caben hoy dentro del tope diario. */
  cupo: number;
  onAviso: (a: Aviso | null) => void;
}) {
  const [filtros, setFiltros] = useState<FiltrosProspectos>(FILTROS_VACIOS);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? "");
  const [from, setFrom] = useState(remitentes[0] ?? "");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [consintiendo, setConsintiendo] = useState<string | null>(null);
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const visibles = useMemo(() => filtrarProspectos(prospectos, filtros), [prospectos, filtros]);
  const plantilla = plantillas.find((t) => t.id === plantillaId) ?? null;
  const elegidas = visibles.filter((p) => seleccion.has(p.id));
  // Solo se selecciona a quien aceptó por teléfono recibir información; en un
  // envío múltiple, además, solo las listas con buzón genérico.
  const seleccionables = visibles.filter((p) => consentimientoVigente(p));
  const enviables = elegidas.filter((p) => consentimientoVigente(p) && p.status === "listo" && p.email_kind !== "personal");
  // Se descarta desde cualquier estado menos baja y rebotado, que no se pisan.
  const descartables = elegidas.filter((p) => ESTADOS_DESCARTABLES.includes(p.status));
  const puedeEnviar = remitentes.length > 0 && !!plantilla && cupo > 0;

  const cambiar = (parcial: Partial<FiltrosProspectos>) => setFiltros((f) => ({ ...f, ...parcial }));
  const alternar = (id: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function ejecutar(accion: () => Promise<{ ok: true; mensaje: string } | { ok: false; error: string }>) {
    onAviso(null);
    startTransition(async () => {
      try {
        const r = await accion();
        onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
        if (r.ok) {
          setSeleccion(new Set());
          setConsintiendo(null);
        }
      } catch {
        onAviso({ ok: false, texto: "No se pudo completar. Revisa el estado de la lista antes de repetirlo." });
        router.refresh();
      }
    });
  }

  function enviarUno(p: ProspectRow) {
    const personal = p.email_kind === "personal";
    if (
      personal &&
      !window.confirm(`${p.email} parece la dirección de una persona, no un buzón de empresa. ¿Enviar igualmente?`)
    ) {
      return;
    }
    ejecutar(() => enviarAction(slug, [p.id], plantillaId, from, personal));
  }

  function enviarSeleccion() {
    const n = Math.min(enviables.length, cupo);
    if (!window.confirm(`Se enviará un correo individual a ${n} empresa${n === 1 ? "" : "s"}. ¿Continuar?`)) return;
    ejecutar(() => enviarAction(slug, enviables.map((p) => p.id), plantillaId, from, false));
  }

  return (
    <section style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <input style={{ ...campo, width: 200 }} placeholder="Buscar en la lista…" value={filtros.texto} onChange={(e) => cambiar({ texto: e.target.value })} />
        <select style={campo} value={filtros.busqueda} onChange={(e) => cambiar({ busqueda: e.target.value })} aria-label="Búsqueda de origen">
          <option value="">Todas las búsquedas</option>
          {busquedas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.params.categoria} · {b.params.ciudad} ({b.total}){b.source === "overture" ? " · Overture" : ""}
            </option>
          ))}
        </select>
        <select style={campo} value={filtros.estado} onChange={(e) => cambiar({ estado: e.target.value as EstadoProspecto | "" })} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS_PROSPECTO.map((e) => (
            <option key={e} value={e}>{ESTADO[e].texto}</option>
          ))}
        </select>
        <select style={campo} value={filtros.email} onChange={(e) => cambiar({ email: e.target.value as "" | "con" | "sin" })} aria-label="Email">
          <option value="">Con y sin email</option>
          <option value="con">Con email</option>
          <option value="sin">Sin email</option>
        </select>
        <select style={campo} value={filtros.web} onChange={(e) => cambiar({ web: e.target.value as "" | "con" | "sin" })} aria-label="Web">
          <option value="">Con y sin web</option>
          <option value="con">Con web</option>
          <option value="sin">Sin web</option>
        </select>
        <span style={{ fontSize: 13, color: "#64748b" }}>{visibles.length} empresas</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <select style={campo} value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} aria-label="Plantilla">
          {plantillas.length === 0 && <option value="">Crea antes una plantilla</option>}
          {plantillas.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {remitentes.length > 1 && (
          <select style={campo} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Remitente">
            {remitentes.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
        <button type="button" disabled={!puedeEnviar || enviables.length === 0 || pendiente} onClick={enviarSeleccion} style={{ ...botonPrimario, opacity: !puedeEnviar || enviables.length === 0 || pendiente ? 0.5 : 1 }}>
          Enviar a {enviables.length} seleccionada{enviables.length === 1 ? "" : "s"}
        </button>
        <button type="button" disabled={descartables.length === 0 || pendiente} onClick={() => ejecutar(() => descartarAction(slug, descartables.map((p) => p.id)))} style={{ ...botonSecundario, opacity: descartables.length === 0 || pendiente ? 0.5 : 1 }}>
          Descartar
        </button>
        {cupo === 0 && <span style={{ fontSize: 13, color: "#b91c1c" }}>Tope de envíos de hoy alcanzado.</span>}
        {elegidas.length > enviables.length && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {elegidas.length - enviables.length} de las seleccionadas no entran: ya contactadas o con dirección personal.
          </span>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas"
                  disabled={seleccionables.length === 0}
                  checked={seleccionables.length > 0 && seleccionables.every((p) => seleccion.has(p.id))}
                  onChange={(e) => setSeleccion(e.target.checked ? new Set(seleccionables.map((p) => p.id)) : new Set())}
                />
              </th>
              <th style={th}>Empresa</th>
              <th style={th}>Ciudad</th>
              <th style={th}>Web</th>
              <th style={th}>Email</th>
              <th style={th}>Teléfono</th>
              <th style={th}>Estado</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }} colSpan={8}>
                  {prospectos.length === 0 ? "Todavía no has buscado ninguna empresa." : "Ninguna empresa coincide con los filtros."}
                </td>
              </tr>
            )}
            {visibles.map((p) => {
              const web = urlSegura(p.website);
              const estado = ESTADO[p.status];
              const consiente = consentimientoVigente(p);
              return (
                <FilaProspecto key={p.id}>
                  <tr>
                    <td style={td}>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${p.name}`}
                        disabled={!consiente}
                        title={consiente ? undefined : "Solo se puede escribir a quien ha aceptado por teléfono recibir información."}
                        checked={consiente && seleccion.has(p.id)}
                        onChange={() => alternar(p.id)}
                      />
                    </td>
                    <td style={td}>
                      <strong>{p.name}</strong>
                      {p.sector && <div style={{ fontSize: 12, color: "#64748b" }}>{p.sector}</div>}
                    </td>
                    <td style={td}>{p.city ?? "—"}</td>
                    <td style={td}>
                      {web ? (
                        <a href={web} target="_blank" rel="noopener noreferrer" style={{ color: "#187bef" }}>
                          {web.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/.*$/, "")}
                        </a>
                      ) : (
                        <span style={{ color: "#b45309", fontWeight: 600 }}>Sin web</span>
                      )}
                    </td>
                    <td style={td}>
                      {p.email ?? <span style={{ color: "#94a3b8" }}>{p.contact_note ?? "—"}</span>}
                      {p.email_kind === "personal" && (
                        <div style={{ fontSize: 11, color: "#b45309", fontWeight: 600 }}>Parece personal</div>
                      )}
                      {p.send_error && <div style={{ fontSize: 11, color: "#b91c1c" }}>Falló: {p.send_error}</div>}
                      {consiente && (
                        <div style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>
                          Aceptó recibir información el {fechaLarga(p.consentimiento_at)}
                          {p.consentimiento_por && nombres[p.consentimiento_por] ? ` (${nombres[p.consentimiento_por]})` : ""}
                          {p.consentimiento_nota && <div style={{ fontWeight: 400, color: "#64748b" }}>{p.consentimiento_nota}</div>}
                        </div>
                      )}
                      {p.consentimiento_retirado_at && (
                        <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 600 }}>
                          Ya no quiere recibir información ({fechaLarga(p.consentimiento_retirado_at)})
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {/* La llamada es el canal principal de Prospección: el teléfono va como botón. */}
                      {enlaceTelefono(p.phone) ? (
                        <a href={enlaceTelefono(p.phone) as string} style={botonLlamar} aria-label={`Llamar a ${p.name}`}>
                          Llamar · {p.phone}
                        </a>
                      ) : (
                        p.phone ?? "—"
                      )}
                      {p.phone && <GuionLlamada />}
                    </td>
                    <td style={td}>
                      <span style={{ background: estado.bg, color: estado.color, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {estado.texto}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {!consiente && ESTADOS_PARA_CONSENTIR.includes(p.status) && (
                        <button type="button" style={enlace} onClick={() => setConsintiendo(consintiendo === p.id ? null : p.id)}>
                          {consintiendo === p.id ? "Cerrar" : "Ha aceptado recibir información"}
                        </button>
                      )}
                      {consiente && p.status === "listo" && plantilla && (
                        <button type="button" style={enlace} onClick={() => setAbierta(abierta === p.id ? null : p.id)}>
                          {abierta === p.id ? "Cerrar" : "Ver y enviar"}
                        </button>
                      )}
                      {consiente && (
                        <button
                          type="button"
                          style={{ ...enlace, color: "#b91c1c" }}
                          disabled={pendiente}
                          onClick={() => {
                            if (window.confirm(`¿Anotar que ${p.name} ya no quiere recibir información? No se le volverá a escribir.`)) {
                              ejecutar(() => retirarConsentimientoAction(slug, p.id));
                            }
                          }}
                        >
                          Ya no quiere recibir información
                        </button>
                      )}
                      {p.status === "enviado" && (
                        <button type="button" style={enlace} disabled={pendiente} onClick={() => ejecutar(() => marcarRespondidoAction(slug, p.id))}>
                          Respondió
                        </button>
                      )}
                      {(p.status === "enviado" || p.status === "respondido" || (consiente && p.status === "listo")) && !p.lead_id && (
                        <button type="button" style={enlace} disabled={pendiente} onClick={() => ejecutar(() => pasarAlEmbudoAction(slug, p.id))}>
                          Pasar al embudo
                        </button>
                      )}
                      {ESTADOS_DESCARTABLES.includes(p.status) && p.status !== "enviado" && p.status !== "respondido" && !p.lead_id && (
                        <button
                          type="button"
                          style={{ ...enlace, color: "#64748b" }}
                          disabled={pendiente}
                          aria-label={`Descartar ${p.name}`}
                          title="Por ejemplo, si en la llamada dice que no le interesa."
                          onClick={() => ejecutar(() => descartarAction(slug, [p.id]))}
                        >
                          Descartar
                        </button>
                      )}
                      {p.lead_id &&
                        (enlaces[p.lead_id] ? (
                          <Link href={`/panel/ventas/${slug}/leads/${enlaces[p.lead_id]}`} style={{ ...enlace, textDecoration: "none", color: "#16a34a" }}>
                            Ver lead →
                          </Link>
                        ) : (
                          <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>En el embudo</span>
                        ))}
                    </td>
                  </tr>
                  {consintiendo === p.id && (
                    <tr>
                      <td style={{ ...td, background: "#f8fafc" }} colSpan={8}>
                        <FormConsentimiento
                          prospecto={p}
                          slug={slug}
                          pendiente={pendiente}
                          onGuardar={(email, nota) => ejecutar(() => registrarConsentimientoAction(slug, p.id, email, nota))}
                          onCancelar={() => setConsintiendo(null)}
                        />
                      </td>
                    </tr>
                  )}
                  {consiente && abierta === p.id && plantilla && (
                    <tr>
                      <td style={{ ...td, background: "#f8fafc" }} colSpan={8}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
                          <VistaPrevia prospecto={p} plantilla={plantilla} />
                          <div>
                            <button type="button" disabled={!puedeEnviar || pendiente} onClick={() => enviarUno(p)} style={{ ...botonPrimario, opacity: !puedeEnviar || pendiente ? 0.5 : 1 }}>
                              {pendiente ? "Enviando…" : "Enviar este correo"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </FilaProspecto>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Lo que hay que decir al llamar (art. 14 RGPD), a mano junto al botón. */
function GuionLlamada() {
  return (
    <details style={{ marginTop: 4, fontSize: 12, color: "#475569", whiteSpace: "normal", maxWidth: 320 }}>
      <summary style={{ cursor: "pointer", color: "#187bef", fontWeight: 600 }}>Qué decir</summary>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.45 }}>
        {GUION_LLAMADA.map((linea) => (
          <li key={linea}>{linea}</li>
        ))}
      </ul>
    </details>
  );
}

/** «Ha aceptado recibir información»: el email al que escribir (el que haya,
 *  para corregirlo) y una nota opcional. «Buscar en su web» rellena el campo
 *  leyendo solo la web de esta empresa, sin guardar nada. */
function FormConsentimiento({
  prospecto,
  slug,
  pendiente,
  onGuardar,
  onCancelar,
}: {
  prospecto: ProspectRow;
  slug: string;
  pendiente: boolean;
  onGuardar: (email: string, nota: string) => void;
  onCancelar: () => void;
}) {
  const [email, setEmail] = useState(prospecto.email ?? "");
  const [nota, setNota] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function buscarEnWeb() {
    setBuscando(true);
    setAviso(null);
    try {
      const r = await buscarEmailWebAction(slug, prospecto.id);
      if (r.ok) setEmail(r.email);
      else setAviso(r.error);
    } catch {
      setAviso("No se pudo leer su web.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(email, nota);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
        Márcalo solo si en la llamada te han dicho que sí quieren recibir información por email. Se guarda la fecha y quién lo registra.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={etiqueta}>
          Email al que escribir
          <input type="email" required maxLength={254} style={{ ...campo, width: 260 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@empresa.es" />
        </label>
        {urlSegura(prospecto.website) && (
          <button type="button" style={enlace} disabled={buscando} onClick={buscarEnWeb}>
            {buscando ? "Buscando…" : "Buscar en su web"}
          </button>
        )}
        <label style={etiqueta}>
          Nota (opcional)
          <input maxLength={300} style={{ ...campo, width: 280 }} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Llamada con la recepcionista" />
        </label>
      </div>
      {aviso && <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>{aviso}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.5 : 1 }}>
          Guardar consentimiento
        </button>
        <button type="button" onClick={onCancelar} style={botonSecundario}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Agrupa la fila y su vista previa bajo una sola `key`. */
function FilaProspecto({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const botonLlamar = {
  display: "inline-block",
  background: "#187bef",
  color: "#fff",
  borderRadius: 8,
  padding: "4px 10px",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
} as const;

const enlace = {
  background: "none",
  border: "none",
  padding: "0 8px 0 0",
  color: "#187bef",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
} as const;
