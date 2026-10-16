"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeRichText } from "@/lib/rich-text";

/**
 * Editor de texto con formato inline para los bloques del email.
 *
 * Es un `contenteditable` con una barra de herramientas mínima: negrita,
 * cursiva, subrayado, color, enlace y quitar formato. Usa `document.execCommand`
 * — está marcado como obsoleto, pero sigue siendo lo único que implementan
 * todos los navegadores para esto, y la alternativa (reescribir la selección a
 * mano con Range) es mucho más código para el mismo resultado.
 *
 * Lo que sale de aquí pasa SIEMPRE por `sanitizeRichText` antes de guardarse, y
 * otra vez al renderizar el email. Lo que el navegador meta de más (estilos
 * pegados desde Word, divs, spans sin color) se cae solo.
 */
export function RichTextField({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState("#187bef");
  const [focused, setFocused] = useState(false);

  // El HTML solo se vuelca en el DOM cuando viene de fuera (carga inicial, IA,
  // plantilla). Si se reescribiera en cada tecleo, el cursor saltaría al inicio.
  useEffect(() => {
    const el = ref.current;
    if (!el || focused) return;
    // Se sanea también al ENTRAR, no solo al salir: el valor viene de la base
    // de datos y podría haberlo escrito otra versión del editor o la IA.
    const safe = sanitizeRichText(value);
    if (el.innerHTML !== safe) el.innerHTML = safe;
  }, [value, focused]);

  const emit = () => {
    const el = ref.current;
    if (el) onChange(sanitizeRichText(el.innerHTML));
  };

  // Última selección conocida dentro del editor. Hace falta porque el diálogo
  // del enlace (window.prompt) roba el foco y hay navegadores que se dejan la
  // selección por el camino: sin esto, el enlace se aplicaba donde no era y el
  // texto perdía el formato que tenía.
  const savedRange = useRef<Range | null>(null);
  const rememberSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (ref.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  };
  const restoreSelection = () => {
    const range = savedRange.current;
    if (!range) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  /** Ejecuta un comando sobre la selección actual sin perder el foco. */
  const exec = (command: string, arg?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    restoreSelection();
    // El color se quiere como <span style="color:…">, que es lo que mejor
    // entienden los clientes de correo. La negrita, la cursiva y el subrayado
    // se quieren como <b>/<i>/<u>: con styleWithCSS activado saldrían también
    // como estilos de un span, más frágiles de transportar a un email.
    document.execCommand("styleWithCSS", false, command === "foreColor" ? "true" : "false");
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    // La selección se guarda ANTES de abrir el diálogo, que es cuando se pierde.
    rememberSelection();
    const url = window.prompt("URL del enlace (https://, mailto: o tel:)", "https://");
    if (!url) return;
    if (!/^(https?:|mailto:|tel:)/i.test(url.trim())) {
      window.alert("Solo se admiten enlaces https://, http://, mailto: o tel:");
      return;
    }
    exec("createLink", url.trim());
  };

  const isEmpty = sanitizeRichText(value).trim() === "";

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
          padding: 4,
          border: "1px solid #e2e8f0",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          background: "#f8fafc",
        }}
      >
        <ToolButton label="B" title="Negrita" bold onClick={() => exec("bold")} />
        <ToolButton label="I" title="Cursiva" italic onClick={() => exec("italic")} />
        <ToolButton label="U" title="Subrayado" underline onClick={() => exec("underline")} />
        <span style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 4px" }} />
        <label
          title="Color del texto seleccionado"
          onMouseDown={(e) => e.preventDefault()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            fontSize: 12,
            color: "#475569",
            padding: "2px 6px",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: color,
              border: "1px solid #cbd5e1",
            }}
          />
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              exec("foreColor", e.target.value);
            }}
            style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
          />
        </label>
        <ToolButton label="🔗" title="Insertar enlace" onClick={addLink} />
        <ToolButton label="⌫" title="Quitar formato" onClick={() => exec("removeFormat")} />
      </div>

      <div style={{ position: "relative" }}>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            emit();
          }}
          onInput={emit}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onSelect={rememberSelection}
          // Pegar siempre en plano: así no entra la maraña de estilos de Word
          // o de una web, que el saneador tiraría igual pero descolocando todo.
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          style={{
            minHeight: rows * 22,
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #e2e8f0",
            borderRadius: "0 0 8px 8px",
            fontSize: 13,
            lineHeight: 1.5,
            fontFamily: "inherit",
            color: "#0f172a",
            background: "#fff",
            outline: "none",
            boxSizing: "border-box",
            overflowWrap: "anywhere",
          }}
        />
        {isEmpty && !focused && placeholder && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 10,
              fontSize: 13,
              color: "#cbd5e1",
              pointerEvents: "none",
            }}
          >
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  label,
  title,
  onClick,
  bold,
  italic,
  underline,
}: {
  label: string;
  title: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      // El mousedown se cancela para que el foco (y con él la selección de
      // texto) siga dentro del editor cuando se ejecuta el comando.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        border: "1px solid #e2e8f0",
        background: "#fff",
        borderRadius: 6,
        minWidth: 28,
        padding: "3px 7px",
        fontSize: 13,
        lineHeight: 1.2,
        color: "#334155",
        cursor: "pointer",
        fontWeight: bold ? 800 : 500,
        fontStyle: italic ? "italic" : "normal",
        textDecoration: underline ? "underline" : "none",
      }}
    >
      {label}
    </button>
  );
}
