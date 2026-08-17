"use client";

import { useRef, useState, useTransition } from "react";
import { requestGrowth } from "@/lib/growth-action";
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
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
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
          <label htmlFor={actual.clave} className="block text-xl font-bold leading-tight text-fg">
            {actual.etiqueta}
          </label>
          <p className="mt-2 text-sm text-fg-muted">{actual.ayuda}</p>
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
              onClick={() => {
                track("growth_calc_step", { step: actual.clave, skipped: false });
                setPaso((p) => p + 1);
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Siguiente
            </button>
            <button
              type="button"
              onClick={() => {
                // La opción "no lo sé" deja el valor vacío, que el servidor
                // interpreta como null. No es un error de validación.
                setValores((v) => ({ ...v, [actual.clave]: "" }));
                track("growth_calc_step", { step: actual.clave, skipped: true });
                setPaso((p) => p + 1);
              }}
              className="text-sm font-semibold text-fg-muted underline underline-offset-2 hover:text-fg"
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
          <p className="text-xl font-bold leading-tight text-fg">
            Últimos datos para ver tu resultado
          </p>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={legendClass}>Nombre</span>
              <input id="name" name="name" required className={inputClass} />
            </label>

            <label className="block">
              <span className={legendClass}>Email</span>
              <input id="email" name="email" type="email" required className={inputClass} />
            </label>

            <label className="block">
              <span className={legendClass}>Teléfono</span>
              <input id="phone" name="phone" type="tel" required className={inputClass} />
            </label>

            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                value="true"
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              />
              <span>Acepto que dinkbit me contacte sobre esta consulta</span>
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
        <p className="text-sm font-semibold text-fg-muted">
          Cada paciente nuevo te está costando
        </p>
        <strong className="mt-2 block text-4xl font-black text-fg">
          {formatEur(resultado.costePorPaciente)}
        </strong>
        {resultado.retorno !== null && (
          <p className="mt-4 text-base text-fg-muted">
            Por cada euro invertido recuperas{" "}
            <strong className="text-fg">{resultado.retorno.toFixed(2).replace(".", ",")} €</strong>.
          </p>
        )}
        <p className="mt-6 text-sm leading-relaxed text-fg-muted">
          Es un cálculo con tus medias. Lo que no sabes es qué campaña te trae los
          pacientes buenos.
        </p>
      </div>
    );
  }

  if (resultado.rama === "B") {
    return (
      <div className="surface-elevated mx-auto max-w-xl rounded-2xl p-6 text-center sm:p-8">
        <strong className="block text-2xl font-black text-fg">No se puede calcular</strong>
        <p className="mt-4 text-base leading-relaxed text-fg-muted">
          {resultado.sinPacientes
            ? "Inviertes y no te está llegando nadie. Eso es lo primero que hay que mirar."
            : "Y eso es justo el hallazgo: nadie está midiendo qué pasa entre el anuncio y la caja."}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-elevated mx-auto max-w-xl rounded-2xl p-6 text-center sm:p-8">
      <strong className="block text-2xl font-black text-fg">
        Todavía no hay coste que medir
      </strong>
      <p className="mt-4 text-base leading-relaxed text-fg-muted">
        Pero sí hay pacientes que no están llegando. Esto es lo que verías si midieras.
      </p>
    </div>
  );
}
