"use client";

import { useState, useTransition } from "react";
import { submitWebExpressBrief } from "@/lib/web-express-brief-action";
import { briefBlocks, type BriefField, type WebExpressBrief } from "@/lib/web-express-brief";

const INK = "#0B1020";
const ACCENT = "#187bef";
const MUTED = "#5A6178";

const inputClass =
  "mt-2 block w-full rounded-xl border px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#187bef]";
const inputStyle = { borderColor: "rgba(11,16,32,.16)", color: INK, background: "#fff" } as const;

function Field({ field }: { field: BriefField }) {
  const label = (
    <>
      <span className="text-[15px] font-bold" style={{ color: INK }}>
        {field.label}
        {field.required && <span style={{ color: ACCENT }}> *</span>}
      </span>
      {field.hint && (
        <span className="mt-1 block text-[13px] leading-relaxed" style={{ color: MUTED }}>
          {field.hint}
        </span>
      )}
    </>
  );

  if (field.type === "textarea") {
    return (
      <label className="block">
        {label}
        <textarea
          name={field.name}
          required={field.required}
          rows={4}
          placeholder={field.placeholder}
          className={`${inputClass} resize-y`}
          style={inputStyle}
        />
      </label>
    );
  }

  if (field.type === "radio" || field.type === "checkbox") {
    return (
      <fieldset>
        <legend>{label}</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {field.options?.map((o) => (
            <label
              key={o}
              className={
                "inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-[rgba(11,16,32,.14)] " +
                "bg-white px-4 py-2 text-[14px] font-semibold text-[#5A6178] transition-all " +
                "has-[:checked]:border-[#187bef] has-[:checked]:bg-[#E7F1FE] has-[:checked]:font-bold has-[:checked]:text-[#0B1020]"
              }
            >
              <input type={field.type} name={field.name} value={o} className="sr-only" />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="block">
      {label}
      <input
        name={field.name}
        required={field.required}
        placeholder={field.placeholder}
        className={inputClass}
        style={inputStyle}
      />
    </label>
  );
}

export function WebExpressBriefForm({ brief }: { brief: WebExpressBrief }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div
        className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center"
        style={{ border: "1px solid rgba(11,16,32,.09)" }}
        role="status"
        aria-live="polite"
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "rgba(24,123,239,.12)" }}
          aria-hidden="true"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12.5l5.5 5.5L20 7"
              stroke={ACCENT}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="mt-5 text-2xl font-black" style={{ color: INK }}>
          ¡Recibido!
        </p>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Ya tenemos tus respuestas. Si marcaste que tienes logotipo, mándanoslo por
          email y con eso arrancan los cinco días laborables.
        </p>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("slug", brief.slug);
        setError(null);
        start(async () => {
          const res = await submitWebExpressBrief(fd);
          if (!res.ok) {
            setError(res.error ?? "No se pudo enviar. Inténtalo de nuevo.");
            return;
          }
          setDone(true);
        });
      }}
      className="flex flex-col gap-8"
    >
      {briefBlocks(brief).map((block) => (
        <section
          key={block.title}
          className="rounded-3xl bg-white p-7 sm:p-9"
          style={{ border: "1px solid rgba(11,16,32,.09)" }}
        >
          <h2 className="text-xl font-black" style={{ color: INK }}>
            {block.title}
          </h2>
          {block.intro && (
            <p className="mt-1.5 text-[15px]" style={{ color: MUTED }}>
              {block.intro}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-6">
            {block.fields.map((f) => (
              <Field key={f.name} field={f} />
            ))}
          </div>
        </section>
      ))}

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl px-10 py-3.5 text-base font-black text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: ACCENT }}
        >
          {pending ? "Enviando…" : "Enviar cuestionario"}
        </button>
        {error && (
          <p className="text-sm font-bold text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
