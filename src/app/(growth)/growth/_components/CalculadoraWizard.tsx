"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { requestGrowth } from "@/lib/growth-action";
import { CONTACT_INFO } from "@/lib/contact-info";
import {
  formatEur,
  proyectar,
  rentabilidad,
  type CalcResult,
  type Proyeccion,
} from "@/lib/growth-calc";
import { GROWTH_THEME as T } from "@/lib/growth-config";
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
            <p role="alert" className="mt-3 text-center text-sm font-bold" style={{ color: T.red }}>
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

/**
 * Una fila del embudo del resultado.
 *
 * La barra es opcional a propósito: solo la llevan las filas de dinero, que
 * son las que se comparan entre sí. Ponérsela también al número de pacientes
 * sugeriría una proporción que no existe y ensuciaría el único mensaje que
 * tiene que dar el gráfico — lo poco que entra al lado de lo mucho que sale.
 */
function FilaResultado({
  etiqueta,
  valor,
  ancho,
  color = T.fg,
}: {
  etiqueta: string;
  valor: string;
  ancho?: number;
  color?: string;
}) {
  return (
    <div className="py-3" style={{ borderBottom: `1px solid ${T.line}` }}>
      <div className="flex items-baseline justify-between gap-4">
        <span
          className="text-[0.7rem] font-bold uppercase tracking-[0.18em]"
          style={{ color: T.muted }}
        >
          {etiqueta}
        </span>
        <span className="text-xl font-black tabular-nums" style={{ color }}>
          {valor}
        </span>
      </div>
      {ancho !== undefined && (
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: T.line }}
          aria-hidden
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${ancho}%`, background: color, opacity: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}

/** Dos cifras grandes una al lado de la otra. */
function ParCifras({
  items,
}: {
  items: { etiqueta: string; valor: string; nota?: string }[];
}) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {items.map((i) => (
        <div
          key={i.etiqueta}
          className="rounded-2xl p-5"
          style={{ background: T.ink, border: `1px solid ${T.line}` }}
        >
          <p
            className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
            style={{ color: T.muted }}
          >
            {i.etiqueta}
          </p>
          <p
            className="mt-1.5 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(1.75rem, 6vw, 2.5rem)", color: T.fg }}
          >
            {i.valor}
          </p>
          {i.nota && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: T.muted }}>
              {i.nota}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Lo que se está dejando encima de la mesa.
 *
 * Es la pieza que mueve a llamar: hasta aquí solo le hemos contado lo que ya
 * sabía. El titular es el dinero de más, y debajo va SIEMPRE el supuesto del
 * que sale — una proyección sin sus condiciones a la vista es publicidad, y
 * este producto se vende justo por lo contrario.
 */
function BloqueProyeccion({ p }: { p: Proyeccion }) {
  const explicacion =
    p.escenario === "bajar-coste"
      ? `Manteniendo tus ${formatEur(p.inversion)} de inversión y bajando un 20 % lo que cuesta traer a cada paciente, hasta ${formatEur(p.costePorPaciente)}.`
      : p.escenario === "subir-inversion"
        ? `Subiendo tu inversión a ${formatEur(p.inversion)} al mes y manteniendo el coste por paciente que ya tienes.`
        : `Empezando con ${formatEur(p.inversion)} al mes y una captación sana para tu ticket, de ${formatEur(p.costePorPaciente)} por paciente.`;

  return (
    <div className="mt-8 rounded-2xl p-6 sm:p-7" style={{ background: T.ink, border: `1px solid ${T.lime}55` }}>
      <p
        className="text-[0.7rem] font-bold uppercase tracking-[0.24em]"
        style={{ color: T.lime }}
      >
        {p.escenario === "empezar" ? "Lo que podrías estar generando" : "Lo que te estás dejando"}
      </p>

      <p
        className="mt-2 font-black leading-none tabular-nums"
        style={{ fontSize: "clamp(2.5rem, 11vw, 4rem)", color: T.lime }}
      >
        +{formatEur(p.generadoExtra)}
      </p>
      <p className="mt-1 text-base font-bold">al mes</p>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: T.muted }}>
        <span>
          <strong style={{ color: T.fg }}>+{p.pacientesExtra}</strong> pacientes al mes
        </span>
        <span>
          Total: <strong style={{ color: T.fg }}>{p.pacientes}</strong> pacientes ·{" "}
          <strong style={{ color: T.fg }}>{formatEur(p.generado)}</strong>
        </span>
      </div>

      <p className="mt-5 text-xs leading-relaxed" style={{ color: T.muted }}>
        {explicacion} Es una estimación conservadora hecha con tus propias cifras, no una
        promesa: lo redondeamos siempre a la baja.
      </p>
    </div>
  );
}

function Resultado({ resultado }: { resultado: CalcResult }) {
  const rent = rentabilidad(resultado);
  const proy = proyectar(resultado);

  if (resultado.rama === "A" && resultado.costePorPaciente !== null) {
    // Con respaldo a propósito: durante un despliegue puede convivir un
    // cliente nuevo con una respuesta antigua sin `entrada`, y quedarse sin
    // resultado por eso rompería la única promesa que le hemos hecho al
    // usuario a cambio de sus datos. Sin el detalle del embudo, pero con su
    // cifra.
    const { inversion, pacientes } = resultado.entrada ?? {
      inversion: null,
      pacientes: null,
      ticket: null,
    };
    // La barra de la inversión se mide contra lo generado, así que la
    // diferencia entre las dos ES el retorno, visto de un vistazo.
    const anchoInversion =
      resultado.generado !== null && inversion !== null && resultado.generado > 0
        ? Math.max(6, (inversion / resultado.generado) * 100)
        : 100;

    return (
      <div className="rounded-3xl p-6 sm:p-8" style={tarjetaStyle}>
        <p
          className="text-center text-[0.7rem] font-bold uppercase tracking-[0.24em]"
          style={{ color: T.muted }}
        >
          Cada paciente nuevo te cuesta
        </p>
        <strong
          className="mt-2 block text-center font-black leading-none tabular-nums"
          style={{ fontSize: "clamp(3rem, 13vw, 5rem)", color: T.fg }}
        >
          {formatEur(resultado.costePorPaciente)}
        </strong>

        {/* Su propio embudo, con las cifras que acaba de dar. */}
        <div className="mt-8">
          {inversion !== null && (
            <FilaResultado
              etiqueta="Inviertes al mes"
              valor={formatEur(inversion)}
              ancho={anchoInversion}
              color={T.red}
            />
          )}
          {pacientes !== null && (
            <FilaResultado etiqueta="Pacientes nuevos" valor={String(pacientes)} color={T.fg} />
          )}
          {resultado.generado !== null && (
            <FilaResultado
              etiqueta="Te generan"
              valor={formatEur(resultado.generado)}
              ancho={100}
              color={T.lime}
            />
          )}
        </div>

        {/* Lo que le queda de verdad, por paciente y al mes. Es lo que un
            dentista quiere saber y lo que ninguna agencia le dice. */}
        {rent && (
          <ParCifras
            items={[
              {
                etiqueta: "Te queda por paciente",
                valor: formatEur(rent.dejaPorPaciente),
                nota: "Tu ticket medio menos lo que cuesta traerlo. No descuenta material ni personal.",
              },
              {
                etiqueta: "Te queda al mes",
                valor: formatEur(rent.dejaAlMes),
                nota: `La captación se lleva el ${Math.round(rent.pesoCaptacion * 100)} % de cada factura.`,
              },
            ]}
          />
        )}

        {/* El retorno, que es la cifra que de verdad importa. */}
        {resultado.retorno !== null && (
          <div className="mt-6 rounded-2xl p-6 text-center" style={{ background: T.lime }}>
            <p
              className="text-[0.7rem] font-bold uppercase tracking-[0.24em]"
              style={{ color: T.ink, opacity: 0.7 }}
            >
              Por cada euro invertido recuperas
            </p>
            <p
              className="mt-1 font-black leading-none tabular-nums"
              style={{ fontSize: "clamp(3.25rem, 15vw, 5.5rem)", color: T.ink }}
            >
              {resultado.retorno.toFixed(2).replace(".", ",")} €
            </p>
          </div>
        )}

        {proy && <BloqueProyeccion p={proy} />}

        <p className="mt-6 text-center text-sm leading-relaxed" style={{ color: T.muted }}>
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
      {proy && (
        <div className="text-left">
          <BloqueProyeccion p={proy} />
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
