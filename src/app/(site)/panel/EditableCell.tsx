"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/** Controlled textarea that saves on blur (only when changed) via a server action. */
export function EditableCell({
  id,
  field,
  action,
  value,
  placeholder,
  rows = 2,
  minWidth = 200,
  autoGrow = false,
  maxHeight = 320,
}: {
  id: string;
  field: "notes" | "followup";
  action: (formData: FormData) => void | Promise<void>;
  value: string;
  placeholder: string;
  rows?: number;
  minWidth?: number;
  /** Crece con el contenido hasta `maxHeight`, para no leer notas largas por una rendija. */
  autoGrow?: boolean;
  maxHeight?: number;
}) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  const lastSaved = useRef(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setVal(value);
    lastSaved.current = value;
  }, [value]);

  // Alto mínimo en píxeles equivalente a `rows` líneas (13px · 1.5 + padding).
  // Sin esto, autoGrow encoge la caja a la altura del contenido e ignora `rows`.
  const minHeight = rows * 20 + 18;

  // Ajusta el alto al contenido, nunca por debajo del mínimo. Se recalcula al
  // escribir, no solo al montar.
  useEffect(() => {
    const el = ref.current;
    if (!autoGrow || !el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [autoGrow, maxHeight, minHeight, val]);

  return (
    <textarea
      ref={ref}
      value={val}
      placeholder={placeholder}
      rows={rows}
      disabled={pending}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val === lastSaved.current) return;
        lastSaved.current = val;
        const fd = new FormData();
        fd.set("id", id);
        fd.set(field, val);
        start(() => action(fd));
      }}
      style={{
        width: "100%",
        minWidth,
        minHeight,
        resize: "both",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: "inherit",
        color: "#0f172a",
        background: pending ? "#f8fafc" : "#fff",
      }}
    />
  );
}
