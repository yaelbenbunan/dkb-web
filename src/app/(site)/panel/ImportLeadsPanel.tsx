"use client";

import { useRef, useState, useTransition } from "react";
import { importLeadsAction, type ImportLeadsResult } from "./actions";
import {
  decodeCsvBytes,
  parseLeadsCsv,
  LEADS_CSV_MAX_ROWS,
  type ParsedLeadsCsv,
} from "@/lib/leads-csv";
import { STATUS_COLORS, statusLabel } from "@/lib/lead-status";

/** Nº de filas de ejemplo que se enseñan antes de importar: suficientes para
 *  ver que las columnas casan, sin convertir el panel en otra tabla. */
const PREVIEW_ROWS = 5;
/** Máximo de avisos listados; el resto se resume ("y N más"). */
const MAX_ERRORS_SHOWN = 8;

export function ImportLeadsPanel({ onDone }: { onDone: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedLeadsCsv | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ImportLeadsResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName(null);
    setCsv("");
    setParsed(null);
    setResult(null);
    setReadError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  async function onPick(file: File | undefined) {
    setResult(null);
    setReadError(null);
    if (!file) {
      reset();
      return;
    }
    try {
      // Se leen los bytes (no `file.text()`) para poder rescatar los ficheros
      // que Excel guarda en Windows-1252 en vez de UTF-8.
      const text = decodeCsvBytes(await file.arrayBuffer());
      setFileName(file.name);
      setCsv(text);
      setParsed(parseLeadsCsv(text));
    } catch {
      reset();
      setReadError("No se pudo leer el fichero. Guárdalo como CSV y vuelve a intentarlo.");
    }
  }

  function onImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setResult(null);
    start(async () => {
      const fd = new FormData();
      fd.set("csv", csv);
      fd.set("skip_duplicates", String(skipDuplicates));
      const r = await importLeadsAction(fd);
      setResult(r);
      // Al terminar bien, el fichero deja de tener sentido: si se queda puesto
      // es fácil darle otra vez a importar y duplicar el alta.
      if (r.ok && r.inserted > 0) {
        setCsv("");
        setParsed(null);
        setFileName(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  const ready = parsed?.rows.length ?? 0;
  const shownErrors = parsed?.errors.slice(0, MAX_ERRORS_SHOWN) ?? [];
  const hiddenErrors = (parsed?.errors.length ?? 0) - shownErrors.length;

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <strong style={{ fontSize: 15 }}>Importar leads desde CSV</strong>
        <a
          href="/panel/plantilla-leads"
          download
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#187bef",
            textDecoration: "none",
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            borderRadius: 999,
            padding: "5px 12px",
          }}
        >
          ⬇ Descargar plantilla
        </a>
        <span style={{ fontSize: 12.5, color: "#64748b" }}>
          Columnas: nombre, telefono, email, web, canal, campana, estado,
          consentimiento, notas. Máximo {LEADS_CSV_MAX_ROWS} filas por fichero.
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={(e) => void onPick(e.target.files?.[0])}
        style={{
          display: "block",
          fontSize: 13,
          padding: "8px 10px",
          border: "1px dashed #cbd5e1",
          borderRadius: 8,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
        }}
      />

      {readError && <Notice tone="error">{readError}</Notice>}

      {parsed && (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              margin: "12px 0",
            }}
          >
            <Pill color="#16a34a">{ready} leads listos</Pill>
            {parsed.errors.length > 0 && (
              <Pill color="#b45309">{parsed.errors.length} filas con aviso</Pill>
            )}
            {fileName && (
              <span style={{ fontSize: 12.5, color: "#64748b" }}>{fileName}</span>
            )}
          </div>

          {parsed.unknownHeaders.length > 0 && (
            <Notice tone="warn">
              Columnas que no se reconocen y se ignoran:{" "}
              <strong>{parsed.unknownHeaders.join(", ")}</strong>.
            </Notice>
          )}

          {shownErrors.length > 0 && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>
                Filas que no se importarán:
              </strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {shownErrors.map((e, i) => (
                  <li key={`${e.line}-${i}`}>
                    Línea {e.line}: {e.message}
                  </li>
                ))}
              </ul>
              {hiddenErrors > 0 && (
                <span style={{ color: "#92400e" }}>y {hiddenErrors} más…</span>
              )}
            </div>
          )}

          {ready > 0 && (
            <div style={{ overflowX: "auto", marginBottom: 12 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                <thead>
                  <tr>
                    {["Nombre", "Teléfono", "Email", "Canal", "Campaña", "Estado", "Consent."].map(
                      (h) => (
                        <th key={h} style={previewTh}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                    <tr key={i}>
                      <td style={previewTd}>{r.name || "—"}</td>
                      <td style={previewTd}>{r.phone || "—"}</td>
                      <td style={previewTd}>{r.email || "—"}</td>
                      <td style={previewTd}>{r.channel}</td>
                      <td style={previewTd}>{r.campaign || "—"}</td>
                      <td style={previewTd}>
                        <span
                          style={{
                            background: STATUS_COLORS[r.status] ?? "#64748b",
                            color: "#fff",
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td style={previewTd}>
                        {r.consent === true ? "Sí" : r.consent === false ? "No" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ready > PREVIEW_ROWS && (
                <p style={{ fontSize: 12.5, color: "#64748b", margin: "6px 2px 0" }}>
                  … y {ready - PREVIEW_ROWS} leads más.
                </p>
              )}
            </div>
          )}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#334155",
              marginBottom: 12,
            }}
          >
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
            />
            Omitir los que ya están en el CRM (mismo email o teléfono)
          </label>
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onImport}
          disabled={pending || ready === 0}
          style={btn("#187bef", "#fff", pending || ready === 0, "#187bef")}
        >
          {pending ? "Importando…" : `Importar ${ready} leads`}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            onDone();
          }}
          disabled={pending}
          style={btn("#fff", "#475569", pending, "#cbd5e1")}
        >
          Cerrar
        </button>
      </div>

      {result && (
        <Notice tone={result.ok ? "ok" : "error"}>
          {result.error ??
            `Importados ${result.inserted} leads` +
              (result.duplicates > 0 ? `, ${result.duplicates} ya estaban en el CRM` : "") +
              (result.errors.length > 0 ? `, ${result.errors.length} filas descartadas` : "") +
              "."}
        </Notice>
      )}
    </section>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        background: color,
        color: "#fff",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "error";
  children: React.ReactNode;
}) {
  const palette = {
    ok: { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
    warn: { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
    error: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
  }[tone];
  return (
    <p
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13,
        margin: "12px 0 0",
      }}
    >
      {children}
    </p>
  );
}

const previewTh: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: 11.5,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  whiteSpace: "nowrap",
};

const previewTd: React.CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  whiteSpace: "nowrap",
  maxWidth: 220,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const btn = (
  bg: string,
  color: string,
  disabled: boolean,
  border: string,
): React.CSSProperties => ({
  background: bg,
  color,
  border: `1px solid ${border}`,
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
});
