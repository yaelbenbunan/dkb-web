"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { appendUtms } from "@/lib/utm";
import { track, pushUserData } from "@/lib/gtm";
import { requestWeb299 } from "@/lib/web-299-action";
import { newEventId, trackMetaLead } from "@/lib/meta-pixel";
import { trackChatGptLead } from "@/lib/chatgpt-pixel";
import { ConsentCheckbox } from "@/components/forms/ConsentCheckbox";
import { WEB_299_PRICE, WEB_299_TERMS_PATH } from "@/lib/web-299";

/**
 * Tres campos: nombre, teléfono y email. Nada más, y es la decisión de producto
 * de esta landing — cada pregunta de cualificación que se añada aquí es gente
 * que abandona. Lo que hace falta saber (qué negocio, para cuándo, si ya tiene
 * dominio) se pregunta en la llamada, que es donde además se vende.
 *
 * COLORES FIJOS, no tokens del tema, por el mismo motivo que la landing de web
 * express: con tokens, este formulario claro acababa con texto casi blanco
 * encima cuando el visitante venía en modo oscuro. Cada superficie declara su
 * fondo Y su color.
 */
const INK = "#0B1020";
const ACCENT = "#0b3ae7";
const MUTED = "#5A6178";

const inputClass =
  "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[16px] outline-none transition-colors focus:border-[#0b3ae7]";
const inputStyle = { borderColor: "rgba(11,16,32,.16)", color: INK, background: "#fff" } as const;

function Campo({
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold uppercase tracking-[0.06em]" style={{ color: MUTED }}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
        style={inputStyle}
      />
    </label>
  );
}

export function Web299Form({ ubicacion }: { ubicacion: "hero" | "cierre" }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Arranca en 0 y se fija AL MONTAR, no al renderizar: el tiempo mínimo tiene
  // que medir cuánto lleva la persona delante del formulario, y además
  // `Date.now()` dentro del render rompe la regla de pureza de React 19.
  //
  // Si por lo que sea se enviara antes de que corra el efecto, `Date.now() - 0`
  // es enorme y la comprobación de tiempo pasa. Falla ABIERTO a propósito: es
  // una trampa para bots, y preferimos dejar entrar un lead dudoso que bloquear
  // a una persona real por una carrera entre el montaje y su primer clic.
  const loadedAt = useRef(0);

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  if (result?.ok) {
    return (
      <div
        className="rounded-2xl p-7 text-center"
        style={{ background: "#fff", border: "1px solid rgba(11,16,32,.10)" }}
      >
        <p className="text-[22px] font-extrabold" style={{ color: INK }}>
          Recibido
        </p>
        <p className="mt-2 text-[15px]" style={{ color: MUTED }}>
          Te llamamos o te escribimos en menos de 24 horas. Si lo prefieres, escríbenos tú por
          WhatsApp y vamos más rápido.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("formLoadedAt", String(loadedAt.current));
        // El mismo eventId para el píxel del navegador y para la conversión por
        // servidor: si llegan los dos, Meta cuenta uno.
        const eventId = newEventId();
        fd.set("eventId", eventId);
        fd.set("pageUrl", typeof window === "undefined" ? "" : window.location.href);
        appendUtms(fd);
        startTransition(async () => {
          const r = await requestWeb299(fd);
          setResult(r);
          if (r.ok) {
            pushUserData({
              email: String(fd.get("email") ?? ""),
              phone: String(fd.get("phone") ?? ""),
            });
            track("generate_lead", { form_location: `web299_${ubicacion}` });
            trackMetaLead(eventId);
            trackChatGptLead(eventId);
            formRef.current?.reset();
          }
        });
      }}
      className="rounded-2xl p-6 sm:p-7"
      style={{ background: "#fff", border: "1px solid rgba(11,16,32,.10)" }}
    >
      <p className="text-[20px] font-extrabold leading-tight" style={{ color: INK }}>
        Cuéntanos y te llamamos
      </p>
      <p className="mt-1.5 text-[14px]" style={{ color: MUTED }}>
        Tres datos y nada más. Te contactamos en menos de 24 horas con una fecha de entrega.
      </p>

      <div className="mt-5 space-y-4">
        <Campo name="name" label="Nombre" placeholder="Tu nombre y apellidos" autoComplete="name" />
        <Campo
          name="phone"
          label="Teléfono"
          type="tel"
          placeholder="600 000 000"
          autoComplete="tel"
        />
        <Campo
          name="email"
          label="Email"
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
        />
      </div>

      {/* Trampa para bots. Fuera de la vista pero NO con `display:none`, que
          algunos rellenadores detectan, y con `tabIndex={-1}` para que nadie
          que navegue con teclado caiga dentro. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No rellenar
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <ConsentCheckbox className="mt-4" />

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-xl px-6 py-4 text-[16px] font-extrabold text-white transition-opacity disabled:opacity-60"
        style={{ background: ACCENT }}
      >
        {pending ? "Enviando…" : `Quiero mi web por ${WEB_299_PRICE}`}
      </button>

      {result?.error ? (
        <p className="mt-3 text-[14px] font-semibold" style={{ color: "#B42318" }}>
          {result.error}
        </p>
      ) : null}

      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: MUTED }}>
        Sin compromiso. Puedes ver las{" "}
        <a href={WEB_299_TERMS_PATH} className="underline" style={{ color: ACCENT }}>
          condiciones del servicio
        </a>
        .
      </p>
    </form>
  );
}
