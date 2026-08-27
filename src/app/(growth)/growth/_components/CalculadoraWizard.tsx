"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { requestGrowth } from "@/lib/growth-action";
import { CONTACT_INFO } from "@/lib/contact-info";
import {
  CAPTACION_SANA,
  costeConSistema,
  formatEur,
  formatEurCompacto,
  rentabilidad,
  type CalcResult,
} from "@/lib/growth-calc";
import { GROWTH_THEME as T } from "@/lib/growth-config";
import { SimuladorInversion } from "./SimuladorInversion";
import { track, pushUserData } from "@/lib/gtm";
import { newEventId, trackMetaLead } from "@/lib/meta-pixel";
import { appendUtms } from "@/lib/utm";

/**
 * Los colores salen de GROWTH_THEME y no de los tokens del sitio.
 *
 * Es deliberado: los tokens (`text-fg`, `surface-elevated`…) cambian con el
 * interruptor claro/oscuro, y esa dependencia ya dejó una vez esta calculadora
 * ilegible —texto casi blanco sobre un panel que es claro en LOS DOS temas—.
 * Aquí el color es explícito y no depende de nada externo.
 */
const tarjetaStyle = {
  background: T.surface,
  border: `1px solid ${T.line}`,
} as const;

const inputStyle = {
  background: T.ink,
  border: `1px solid ${T.line}`,
  color: T.fg,
} as const;

const inputClass =
  "mt-1.5 block w-full rounded-xl px-4 py-3 text-base outline-none focus:border-[#C7F73E]";
const legendClass = "text-xs font-bold uppercase tracking-[0.18em]";
const botonPrincipalClass =
  "inline-flex h-13 items-center justify-center rounded-full px-7 text-base font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

/**
 * Vuelta al paso anterior.
 *
 * Discreto y separado de los botones de avance a propósito: es una salida de
 * emergencia para quien se ha equivocado en una cifra, no una opción que
 * compita con seguir adelante. Los valores ya escritos se conservan porque
 * viven en el estado del wizard y no en el paso.
 */
function Volver({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-4"
      style={{ color: T.muted }}
    >
      <span aria-hidden>←</span> Volver al paso anterior
    </button>
  );
}

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

export function CalculadoraWizard({
  /**
   * Resultado ya calculado con el que arrancar, saltándose el cuestionario.
   *
   * Solo lo usa la ruta de demostración, y lo calcula el SERVIDOR: aquí no se
   * importa `calcular` a propósito, porque poder calcular en cliente es
   * justo lo que permitiría enseñar el resultado sin pedir el contacto. En
   * el embudo real este prop no se pasa nunca.
   */
  resultadoInicial,
}: {
  resultadoInicial?: CalcResult;
} = {}) {
  const [paso, setPaso] = useState(0);
  const [valores, setValores] = useState({ inversion: "", pacientes: "", ticket: "" });
  const [resultado, setResultado] = useState<CalcResult | null>(resultadoInicial ?? null);
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
    <div className="rounded-3xl p-7 sm:p-9" style={tarjetaStyle}>
      <div className="flex items-center gap-3">
        <div
          className="h-1 flex-1 overflow-hidden rounded-full"
          style={{ background: T.line }}
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((paso + 1) / total) * 100}%`, background: T.lime }}
          />
        </div>
        <p className="shrink-0 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: T.muted }}>
          {paso + 1} de {total}
        </p>
      </div>
      <p className="mt-3 text-xs" style={{ color: T.muted }}>
        Al terminar verás tu resultado
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
        <div className="mt-7">
          <label
            htmlFor={actual.clave}
            className="block font-black leading-tight"
            style={{ fontSize: "clamp(1.375rem, 3.5vw, 1.875rem)", color: T.fg }}
          >
            {actual.etiqueta}
          </label>
          <p className="mt-3 text-sm" style={{ color: T.muted }}>
            {actual.ayuda}
          </p>
          <input
            id={actual.clave}
            name={actual.clave}
            inputMode="decimal"
            value={valores[actual.clave]}
            onChange={(e) => setValores((v) => ({ ...v, [actual.clave]: e.target.value }))}
            className={`${inputClass} mt-5`}
            style={inputStyle}
          />
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={valores[actual.clave].trim() === ""}
              onClick={() => {
                track("growth_calc_step", { step: actual.clave, skipped: false });
                setPaso((p) => p + 1);
              }}
              className={botonPrincipalClass}
              style={{ background: T.lime, color: T.ink }}
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
              className="text-sm font-bold underline underline-offset-4"
              style={{ color: T.muted }}
            >
              {actual.omitir}
            </button>
          </div>

          {paso > 0 && <Volver onClick={() => setPaso((p) => p - 1)} />}
        </div>
      ) : (
        <form
          className="mt-7"
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
          <p
            className="font-black leading-tight"
            style={{ fontSize: "clamp(1.375rem, 3.5vw, 1.875rem)", color: T.fg }}
          >
            Últimos datos y te enseñamos el resultado
          </p>

          <div className="mt-6 space-y-4">
            <label htmlFor="name" className="block">
              <span className={legendClass} style={{ color: T.lime }}>
                Nombre
              </span>
              <input id="name" name="name" required className={inputClass} style={inputStyle} />
            </label>

            <label htmlFor="email" className="block">
              <span className={legendClass} style={{ color: T.lime }}>
                Email
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
                style={inputStyle}
              />
            </label>

            <label htmlFor="phone" className="block">
              <span className={legendClass} style={{ color: T.lime }}>
                Teléfono
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className={inputClass}
                style={inputStyle}
              />
            </label>

            <label
              htmlFor="consent"
              className="flex items-start gap-3 text-xs leading-relaxed"
              style={{ color: T.muted }}
            >
              <input
                id="consent"
                name="consent"
                type="checkbox"
                value="true"
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#C7F73E]"
              />
              <span>
                Acepto que dinkbit me contacte sobre esta consulta y me envíe
                comunicaciones comerciales, según la{" "}
                <Link
                  href="/privacidad"
                  className="font-bold underline underline-offset-2"
                  style={{ color: T.lime }}
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
            className={`${botonPrincipalClass} mt-7 w-full`}
            style={{ background: T.lime, color: T.ink }}
          >
            {pendiente ? "Calculando…" : "Ver mi resultado"}
          </button>
          {error && (
            <p role="alert" className="mt-3 text-center text-sm font-bold" style={{ color: T.alerta }}>
              {error}
            </p>
          )}

          <Volver onClick={() => setPaso((p) => p - 1)} />
        </form>
      )}
    </div>
  );
}

/** Una cifra del bloque de "tus números", con su explicación debajo. */
function Dato({
  etiqueta,
  valor,
  nota,
  destacar = false,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  destacar?: boolean;
}) {
  return (
    <div className="py-3" style={{ borderTop: `1px solid ${T.line}` }}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-bold" style={{ color: T.fg }}>
          {etiqueta}
        </span>
        <span
          className="whitespace-nowrap font-black tabular-nums"
          style={{
            fontSize: destacar ? "clamp(1.5rem, 5vw, 2rem)" : "clamp(1.125rem, 4vw, 1.375rem)",
            color: destacar ? T.lime : T.fg,
          }}
        >
          {valor}
        </span>
      </div>
      {nota && (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: T.muted }}>
          {nota}
        </p>
      )}
    </div>
  );
}

function Resultado({ resultado }: { resultado: CalcResult }) {
  if (resultado.rama === "A" && resultado.costePorPaciente !== null) {
    // Con respaldo a propósito: durante un despliegue puede convivir un
    // cliente nuevo con una respuesta antigua sin `entrada`, y quedarse sin
    // resultado por eso rompería la única promesa que le hemos hecho al
    // usuario a cambio de sus datos.
    const { inversion, pacientes, ticket } = resultado.entrada ?? {
      inversion: null,
      pacientes: null,
      ticket: null,
    };
    const rent = rentabilidad(resultado);

    return (
      <div className="rounded-3xl p-6 sm:p-8" style={tarjetaStyle}>
        {/* 1. Lo que nos ha contado, para que reconozca sus propias cifras
               antes de que le enseñemos ninguna conclusión. */}
        <p
          className="text-[0.7rem] font-bold uppercase tracking-[0.24em]"
          style={{ color: T.muted }}
        >
          Con tus datos
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            inversion !== null ? `${formatEurCompacto(inversion)} al mes` : null,
            pacientes !== null ? `${pacientes} pacientes` : null,
            ticket !== null ? `${formatEurCompacto(ticket)} de ticket` : null,
          ]
            .filter(Boolean)
            .map((t) => (
              <span
                key={t as string}
                className="rounded-full px-3 py-1.5 text-xs font-bold"
                style={{ background: T.ink, border: `1px solid ${T.line}`, color: T.fg }}
              >
                {t}
              </span>
            ))}
        </div>

        {/* 2. Qué significan esas cifras hoy. */}
        <p
          className="mt-8 font-black leading-tight"
          style={{ fontSize: "clamp(1.375rem, 4.5vw, 1.875rem)" }}
        >
          Esto es lo que te sale hoy
        </p>
        <div className="mt-4">
          <Dato
            etiqueta="Te cuesta cada paciente"
            valor={formatEurCompacto(resultado.costePorPaciente)}
            nota="Lo que inviertes dividido entre los pacientes que te llegan."
          />
          {rent && (
            <Dato
              etiqueta="Te deja cada paciente"
              valor={formatEurCompacto(rent.dejaPorPaciente)}
              nota="Tu ticket medio menos lo que cuesta traerlo. No descuenta material ni personal."
            />
          )}
          {resultado.generado !== null && (
            <Dato
              etiqueta="Facturas al mes"
              valor={formatEurCompacto(resultado.generado)}
              nota="Tus pacientes nuevos por tu ticket medio."
            />
          )}
          {resultado.retorno !== null && rent && (
            <Dato
              etiqueta="Te queda al mes"
              valor={formatEurCompacto(rent.dejaAlMes)}
              nota={`Por cada euro invertido recuperas ${resultado.retorno
                .toFixed(1)
                .replace(".", ",")} €, un ${Math.round(resultado.retorno * 100)} %.`}
              destacar
            />
          )}
        </div>

        {/* 3. Y lo que saldría con nosotros. Una sola proyección. */}
        {ticket !== null && (
          <div className="mt-8">
            <SimuladorInversion
              actual={
                inversion !== null && pacientes !== null && resultado.generado !== null
                  ? {
                      inversion,
                      pacientes,
                      costePorPaciente: resultado.costePorPaciente,
                      generado: resultado.generado,
                    }
                  : null
              }
              costeConNosotros={costeConSistema(resultado.costePorPaciente)}
              ticket={ticket}
            />
          </div>
        )}

        <p className="mt-6 text-sm leading-relaxed" style={{ color: T.muted }}>
          Es un cálculo con tus medias. Lo que no sabes es qué campaña te trae los pacientes
          buenos — y ahí es donde está el dinero.
        </p>
        <DiagnosticoCta />
      </div>
    );
  }

  if (resultado.rama === "B") {
    return (
      <div className="rounded-3xl p-7 text-center sm:p-9" style={tarjetaStyle}>
        <strong
          className="block font-black leading-tight"
          style={{ fontSize: "clamp(1.75rem, 6vw, 2.75rem)", color: T.lime }}
        >
          No se puede calcular
        </strong>
        <p className="mt-5 text-base leading-relaxed" style={{ color: T.muted }}>
          {resultado.sinPacientes
            ? "Inviertes y no te está llegando nadie. Eso es lo primero que hay que mirar."
            : "Y eso es justo el hallazgo: nadie está midiendo qué pasa entre el anuncio y la caja."}
        </p>
        <DiagnosticoCta />
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-7 text-center sm:p-9" style={tarjetaStyle}>
      <strong
        className="block font-black leading-tight"
        style={{ fontSize: "clamp(1.75rem, 6vw, 2.75rem)", color: T.lime }}
      >
        Todavía no hay coste que medir
      </strong>
      <p className="mt-5 text-base leading-relaxed" style={{ color: T.muted }}>
        Pero sí hay pacientes que no están llegando. Esto es lo que verías si midieras.
      </p>
      {resultado.generado !== null && (
        <p className="mt-4 text-base leading-relaxed" style={{ color: T.muted }}>
          Y los que ya te llegan por recomendación te están generando{" "}
          <strong style={{ color: T.fg }}>{formatEur(resultado.generado)}</strong> al mes, sin
          gastar nada en publicidad todavía.
        </p>
      )}
      {/* Aquí la proyección es el argumento entero: sin inversión no hay nada
          que analizar, solo lo que se está dejando de ganar. */}
      {resultado.entrada.ticket !== null && (
        <div className="mt-8 text-left">
          <SimuladorInversion
            actual={null}
            costeConNosotros={Math.round(resultado.entrada.ticket * CAPTACION_SANA * 100) / 100}
            ticket={resultado.entrada.ticket}
          />
        </div>
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
    <div className="mt-8">
      <a
        href={`${CONTACT_INFO.socials.whatsapp}?text=${mensaje}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${botonPrincipalClass} w-full`}
        style={{ background: T.lime, color: T.ink }}
      >
        Pídenos el diagnóstico comentado
      </a>
      <p className="mt-3 text-xs" style={{ color: T.muted }}>
        Media hora, sin compromiso. Te contamos qué haríamos con tus números.
      </p>
    </div>
  );
}
