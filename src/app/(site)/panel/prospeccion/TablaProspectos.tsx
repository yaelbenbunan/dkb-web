"use client";

import { useMemo, useState, useTransition } from "react";
import { FILTROS_VACIOS, filtrarProspectos, type FiltrosProspectos } from "@/lib/prospeccion/filtros";
import {
  ESTADOS_PROSPECTO,
  type EstadoProspecto,
  type ProspectRow,
  type ProspectSearchRow,
  type ProspectTemplateRow,
} from "@/lib/prospeccion/tipos";
import { botonPrimario, botonSecundario, campo, tarjeta, td, th } from "../_componentes/estilos";
import { convertirEnLeadAction, descartarAction, enviarAction, marcarRespondidoAction } from "./actions";
import type { Aviso } from "./Prospeccion";
import { VistaPrevia } from "./VistaPrevia";

const ESTADO: Record<EstadoProspecto, { texto: string; bg: string; color: string }> = {
  nuevo: { texto: "Sin revisar", bg: "#e2e8f0", color: "#334155" },
  listo: { texto: "Listo", bg: "#dbeafe", color: "#1e40af" },
  sin_contacto: { texto: "Sin email", bg: "#f1f5f9", color: "#64748b" },
  enviado: { texto: "Enviado", bg: "#dcfce7", color: "#166534" },
  respondido: { texto: "Respondió", bg: "#ede9fe", color: "#5b21b6" },
  rebotado: { texto: "Rebotó", bg: "#fee2e2", color: "#b91c1c" },
  baja: { texto: "Baja", bg: "#fee2e2", color: "#b91c1c" },
  descartado: { texto: "Descartado", bg: "#f1f5f9", color: "#94a3b8" },
};

function urlSegura(web: string | null): string | null {
  return web && /^https?:\/\//i.test(web) ? web : null;
}

export function TablaProspectos({
  prospectos,
  busquedas,
  plantillas,
  remitentes,
  cupo,
  onAviso,
}: {
  prospectos: ProspectRow[];
  busquedas: ProspectSearchRow[];
  plantillas: ProspectTemplateRow[];
  remitentes: string[];
  /** Correos que aún caben hoy dentro del tope diario. */
  cupo: number;
  onAviso: (a: Aviso | null) => void;
}) {
  const [filtros, setFiltros] = useState<FiltrosProspectos>(FILTROS_VACIOS);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? "");
  const [from, setFrom] = useState(remitentes[0] ?? "");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const visibles = useMemo(() => filtrarProspectos(prospectos, filtros), [prospectos, filtros]);
  const plantilla = plantillas.find((t) => t.id === plantillaId) ?? null;
  const elegidas = visibles.filter((p) => seleccion.has(p.id));
  // En un envío múltiple solo entran las listas con buzón genérico.
  const enviables = elegidas.filter((p) => p.status === "listo" && p.email_kind !== "personal");
  // Solo se descarta lo que aún no se ha contactado: lo enviado conserva su historia.
  const descartables = elegidas.filter((p) => p.status === "nuevo" || p.status === "listo" || p.status === "sin_contacto");
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
      const r = await accion();
      onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      if (r.ok) setSeleccion(new Set());
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
    ejecutar(() => enviarAction([p.id], plantillaId, from, personal));
  }

  function enviarSeleccion() {
    const n = Math.min(enviables.length, cupo);
    if (!window.confirm(`Se enviará un correo individual a ${n} empresa${n === 1 ? "" : "s"}. ¿Continuar?`)) return;
    ejecutar(() => enviarAction(enviables.map((p) => p.id), plantillaId, from, false));
  }

  return (
    <section style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <input style={{ ...campo, width: 200 }} placeholder="Buscar en la lista…" value={filtros.texto} onChange={(e) => cambiar({ texto: e.target.value })} />
        <select style={campo} value={filtros.busqueda} onChange={(e) => cambiar({ busqueda: e.target.value })} aria-label="Búsqueda de origen">
          <option value="">Todas las búsquedas</option>
          {busquedas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.params.categoria} · {b.params.ciudad} ({b.total})
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
        <button type="button" disabled={descartables.length === 0 || pendiente} onClick={() => ejecutar(() => descartarAction(descartables.map((p) => p.id)))} style={{ ...botonSecundario, opacity: descartables.length === 0 || pendiente ? 0.5 : 1 }}>
          Descartar
        </button>
        {cupo === 0 && <span style={{ fontSize: 13, color: "#b91c1c" }}>Tope de envíos de hoy alcanzado.</span>}
        {elegidas.length > enviables.length && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {elegidas.length - enviables.length} de las seleccionadas no entran: sin email, ya contactadas o con dirección personal.
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
                  checked={visibles.length > 0 && visibles.every((p) => seleccion.has(p.id))}
                  onChange={(e) => setSeleccion(e.target.checked ? new Set(visibles.map((p) => p.id)) : new Set())}
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
              return (
                <FilaProspecto key={p.id}>
                  <tr>
                    <td style={td}>
                      <input type="checkbox" aria-label={`Seleccionar ${p.name}`} checked={seleccion.has(p.id)} onChange={() => alternar(p.id)} />
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
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{p.phone ?? "—"}</td>
                    <td style={td}>
                      <span style={{ background: estado.bg, color: estado.color, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {estado.texto}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {p.status === "listo" && plantilla && (
                        <button type="button" style={enlace} onClick={() => setAbierta(abierta === p.id ? null : p.id)}>
                          {abierta === p.id ? "Cerrar" : "Ver y enviar"}
                        </button>
                      )}
                      {p.status === "enviado" && (
                        <button type="button" style={enlace} disabled={pendiente} onClick={() => ejecutar(() => marcarRespondidoAction(p.id))}>
                          Respondió
                        </button>
                      )}
                      {(p.status === "enviado" || p.status === "respondido") && !p.lead_id && (
                        <button type="button" style={enlace} disabled={pendiente} onClick={() => ejecutar(() => convertirEnLeadAction(p.id))}>
                          Convertir en lead
                        </button>
                      )}
                      {p.lead_id && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>En el CRM</span>}
                    </td>
                  </tr>
                  {abierta === p.id && plantilla && (
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

/** Agrupa la fila y su vista previa bajo una sola `key`. */
function FilaProspecto({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const enlace = {
  background: "none",
  border: "none",
  padding: "0 8px 0 0",
  color: "#187bef",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
} as const;
