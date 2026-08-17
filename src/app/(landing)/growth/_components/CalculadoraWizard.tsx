"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { requestGrowth } from "@/lib/growth-action";
import { CONTACT_INFO } from "@/lib/contact-info";
import { formatEur, type CalcResult } from "@/lib/growth-calc";
import { track, pushUserData } from "@/lib/gtm";
import { newEventId, trackMetaLead } from "@/lib/meta-pixel";
import { appendUtms } from "@/lib/utm";

const inputClass = "surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm";
const legendClass = "text-xs font-bold uppercase tracking-wider text-accent";

interface PasoNumerico {
  clave: "inversion" | "pacientes" | "ticket";
  etiqueta: string;
  ayuda: string;
  omitir: string;
}

const PASOS: PasoNumerico[] = [
  {
    clave: "inversion",
    etiqueta: "¿Cuánto inviertes al mes en publicidad?",
    ayuda: "Google, Meta, o lo que uses. Aproximado vale.",
    omitir: "No invierto todavía",
  },
  {
    clave: "pacientes",
    etiqueta: "¿Cuántos pacientes nuevos te llegan al mes de esa publicidad?",
    ayuda: "Pacientes que acaban viniendo, no formularios recibidos.",
    omitir: "No lo sé",
  },
  {
    clave: "ticket",
    etiqueta: "¿Cuál es tu ticket medio por paciente?",
    ayuda: "Nos sirve para calcular cuánto te generan. Es opcional.",
    omitir: "Prefiero no decirlo",
  },
];

export function CalculadoraWizard() {
  const [paso, setPaso] = useState(0);
  const [valores, setValores] = useState({ inversion: "", pacientes: "", ticket: "" });
  const [resultado, setResultado] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const cargadoEn = useRef(Date.now());
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Se anuncia desde el primer paso que al terminar ve su resultado: pedir el
  // contacto antes solo funciona si no se lee como cambiazo.
  const total = PASOS.length + 1;

  if (resultado) return <Resultado resultado={resultado} />;

  const actual = PASOS[paso];

  return (
    <div className="surface-elevated mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
      {/* surface-elevated es un panel claro en los dos temas (decisión de
          diseño en globals.css), así que el texto de dentro va con los
          colores oscuros del patrón del repo (MarketingLeadForm, ContactForm,
          etc.) y no con los tokens text-fg/text-fg-muted, que en tema oscuro
          —el que sirve el SSR— son casi blancos e ilegibles sobre este fondo. */}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
        Paso {paso + 1} de {total} · Al terminar verás tu resultado
      </p>

      {/* Honeypot: presente desde el primer paso, no solo en el de contacto,
          para que un bot que rellena el wizard entero también caiga. Vive
          fuera del <form> del último paso y se añade a mano al FormData en el
          envío; con `style` y no solo con la clase `hidden` porque en los
          tests no hay hoja de estilos cargada y jsdom solo respeta el estilo
          inline al decidir si el elemento es visible. */}
      <input
        ref={honeypotRef}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        style={{ display: "none" }}
      />

      {actual ? (
        <div className="mt-6">
          <label
            htmlFor={actual.clave}
            className="block text-xl font-bold leading-tight text-[#0c1c40]"
          >
            {actual.etiqueta}
          </label>
          <p className="mt-2 text-sm text-slate-700">{actual.ayuda}</p>
          <input
            id={actual.clave}
            name={actual.clave}
            inputMode="decimal"
            value={valores[actual.clave]}
            onChange={(e) => setValores((v) => ({ ...v, [actual.clave]: e.target.value }))}
            className={`${inputClass} mt-4 text-base`}
          />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={valores[actual.clave].trim() === ""}
              onClick={() => {
                track("growth_calc_step", { step: actual.clave, skipped: false });
                setPaso((p) => p + 1);
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-accent"
            >
              Siguiente
            </button>
            <button
              type="button"
              onClick={() => {
                // La opción "no lo sé" deja el valor vacío, que el servidor
                // interpreta como null. No es un error de validación: que
                // "Siguiente" quede deshabilitado con el campo vacío no toca
                // esta vía, que sigue siendo la respuesta de primera clase que
                // pide el spec, no un caso a evitar.
                setValores((v) => ({ ...v, [actual.clave]: "" }));
                track("growth_calc_step", { step: actual.clave, skipped: true });
                setPaso((p) => p + 1);
              }}
              className="text-sm font-semibold text-slate-700 underline underline-offset-2 hover:text-[#0c1c40]"
            >
              {actual.omitir}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="mt-6"
          action={(fd) => {
            fd.set("inversion", valores.inversion);
            fd.set("pacientes", valores.pacientes);
            fd.set("ticket", valores.ticket);
            fd.set("website", honeypotRef.current?.value ?? "");
            fd.set("formLoadedAt", String(cargadoEn.current));
            const eventId = newEventId();
            fd.set("eventId", eventId);
            fd.set("sourceUrl", window.location.href);
            appendUtms(fd);
            setError(null);
            startTransition(async () => {
              const res = await requestGrowth(fd);
              if (!res.ok || !res.resultado) {
                setError(res.error ?? "No se pudo enviar. Inténtalo de nuevo.");
                return;
              }
              pushUserData({
                email: String(fd.get("email") ?? ""),
                phone: String(fd.get("phone") ?? ""),
              });
              track("generate_lead", { form_location: "growth_calculadora" });
              trackMetaLead(eventId);
              setResultado(res.resultado);
            });
          }}
        >
          <p className="text-xl font-bold leading-tight text-[#0c1c40]">
            Últimos datos para ver tu resultado
          </p>

          <div className="mt-4 space-y-4">
            <label htmlFor="name" className="block">
              <span className={legendClass}>Nombre</span>
              <input id="name" name="name" required className={inputClass} />
            </label>

            <label htmlFor="email" className="block">
              <span className={legendClass}>Email</span>
              <input id="email" name="email" type="email" required className={inputClass} />
            </label>

            <label htmlFor="phone" className="block">
              <span className={legendClass}>Teléfono</span>
              <input id="phone" name="phone" type="tel" required className={inputClass} />
            </label>

            <label
              htmlFor="consent"
              className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700"
            >
              <input
                id="consent"
                name="consent"
                type="checkbox"
                value="true"
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              />
              <span>
                Acepto que dinkbit me contacte sobre esta consulta y me envíe
                comunicaciones comerciales, según la{" "}
                <Link
                  href="/privacidad"
                  className="font-semibold text-accent hover:underline"
                >
                  política de privacidad
                </Link>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={pendiente}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pendiente ? "Calculando…" : "Ver mi resultado"}
          </button>
          {error && (
            <p role="alert" className="mt-3 text-center text-sm font-bold text-red-600">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function Resultado({ resultado }: { resultado: CalcResult }) {
  if (resultado.rama === "A" && resultado.costePorPaciente !== null) {
    return (
      <div className="surface-elevated mx-auto max-w-xl rounded-2xl p-6 text-center sm:p-8">
        <p className="text-sm font-semibold text-slate-700">
          Cada paciente nuevo te está costando
        </p>
        <strong className="mt-2 block text-4xl font-black text-[#0c1c40]">
          {formatEur(resultado.costePorPaciente)}
        </strong>
        {resultado.retorno !== null && resultado.generado !== null && (
          <p className="mt-4 text-base text-slate-700">
            Y esos pacientes te generan en total{" "}
            <strong className="text-[#0c1c40]">{formatEur(resultado.generado)}</strong>, así
            que por cada euro invertido recuperas{" "}
            <strong className="text-[#0c1c40]">
              {resultado.retorno.toFixed(2).replace(".", ",")} €
            </strong>
            .
          </p>
        )}
        <p className="mt-6 text-sm leading-relaxed text-slate-700">
          Es un cálculo con tus medias. Lo que no sabes es qué campaña te trae los
          pacientes buenos.
        </p>
        <DiagnosticoCta />
      </div>
    );
  }

  if (resultado.rama === "B") {
    return (
      <div className="surface-elevated mx-auto max-w-xl rounded-2xl p-6 text-center sm:p-8">
        <strong className="block text-2xl font-black text-[#0c1c40]">
          No se puede calcular
        </strong>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          {resultado.sinPacientes
            ? "Inviertes y no te está llegando nadie. Eso es lo primero que hay que mirar."
            : "Y eso es justo el hallazgo: nadie está midiendo qué pasa entre el anuncio y la caja."}
        </p>
        <DiagnosticoCta />
      </div>
    );
  }

  return (
    <div className="surface-elevated mx-auto max-w-xl rounded-2xl p-6 text-center sm:p-8">
      <strong className="block text-2xl font-black text-[#0c1c40]">
        Todavía no hay coste que medir
      </strong>
      <p className="mt-4 text-base leading-relaxed text-slate-700">
        Pero sí hay pacientes que no están llegando. Esto es lo que verías si midieras.
      </p>
      {resultado.generado !== null && (
        <p className="mt-4 text-base text-slate-700">
          Y los que ya te llegan por recomendación te están generando{" "}
          <strong className="text-[#0c1c40]">{formatEur(resultado.generado)}</strong> al mes,
          sin gastar nada en publicidad todavía.
        </p>
      )}
      <DiagnosticoCta />
    </div>
  );
}

/**
 * Único CTA de cierre de las tres ramas del resultado (spec §4.3): pide el
 * diagnóstico comentado, nunca "contratar". Reutiliza el mismo número y
 * patrón de WhatsApp que ya usa el resto del sitio (WhatsAppBubble,
 * WHATSAPP_CTA de lead-emails.ts), con mensaje prerrellenado como hace
 * promo-email.ts.
 */
function DiagnosticoCta() {
  const mensaje = encodeURIComponent(
    "Hola, acabo de usar la calculadora de coste por paciente y quiero el diagnóstico comentado.",
  );
  return (
    <div className="mt-6">
      <a
        href={`${CONTACT_INFO.socials.whatsapp}?text=${mensaje}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Pídenos el diagnóstico comentado
      </a>
      <p className="mt-2 text-xs text-slate-700">
        Media hora, sin compromiso. Te contamos qué haríamos con tus números.
      </p>
    </div>
  );
}
