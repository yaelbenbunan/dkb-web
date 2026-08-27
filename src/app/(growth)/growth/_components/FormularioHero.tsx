"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { requestGrowth } from "@/lib/growth-action";
import { GROWTH_THEME as T } from "@/lib/growth-config";
import { track, pushUserData } from "@/lib/gtm";
import { newEventId, trackMetaLead } from "@/lib/meta-pixel";
import { appendUtms } from "@/lib/utm";

/**
 * El formulario de arriba del todo.
 *
 * **Existe porque la calculadora no puede ser la única puerta.** Pedía tres
 * cifras antes de llegar a los datos de contacto, y quien ya está convencido
 * —o quien no se sabe sus números y no quiere reconocerlo— no tiene por dónde
 * entrar. Este captura al que llega decidido; la calculadora sigue estando,
 * ahora en su propia página, para quien necesita que le enseñen el problema.
 *
 * **Pregunta el tipo de centro y nada más.** Es el único dato que cambia la
 * primera llamada —a una clínica dental y a un centro de estética no se les
 * enseña el mismo caso— y se responde en un toque. Cualquier campo de más aquí
 * arriba se paga en leads perdidos.
 *
 * **Y va en claro sobre el fondo oscuro, no en gris sobre negro.** Era una
 * tarjeta apenas un tono más clara que la página: se camuflaba justo donde
 * tiene que llamar la atención. En una página casi negra, lo blanco es lo único
 * que grita "esto se rellena". El botón invierte otra vez —negro con letra
 * lima— para que dentro de la tarjeta clara siga habiendo un punto de máximo
 * contraste, que es donde tiene que ir el dedo.
 */

/** La tarjeta clara. Estos colores solo viven aquí: no son del tema. */
const PAPEL = "#F5F7F8";
const TINTA = "#08090C";
const BORDE = "rgba(11, 27, 43, 0.16)";
const SECTORES = [
  "Clínica dental",
  "Centro de estética",
  "Fisioterapia",
  "Psicología",
  "Otro",
] as const;

export function FormularioHero() {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const cargadoEn = useRef(Date.now());

  if (enviado) {
    return (
      <div
        id="empezar"
        role="status"
        className="scroll-mt-8 rounded-3xl p-7 sm:p-8"
        style={{ background: PAPEL, color: TINTA, boxShadow: `0 0 0 6px ${T.lime}22` }}
      >
        <p className="text-2xl font-black leading-tight">Recibido.</p>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "rgba(11,27,43,0.65)" }}>
          Te escribimos hoy mismo. Mientras tanto, si quieres ir con los deberes hechos,
          calcula lo que te cuesta hoy conseguir un paciente.
        </p>
        <Link
          href="/growth/calculadora"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full px-7 text-base font-bold"
          style={{ background: TINTA, color: T.lime }}
        >
          Calcular
        </Link>
      </div>
    );
  }

  return (
    <form
      id="empezar"
      // `scroll-mt` para que al llegar desde los botones de los packs no se
      // pegue al borde de arriba de la ventana.
      className="relative scroll-mt-8 rounded-3xl p-7 sm:p-8"
      style={{
        background: PAPEL,
        color: TINTA,
        // Un halo de lima en vez de un borde: separa la tarjeta del fondo sin
        // dibujarle una caja alrededor.
        boxShadow: `0 0 0 6px ${T.lime}22, 0 30px 60px -20px rgba(0,0,0,0.6)`,
      }}
      action={(fd) => {
        // La calculadora manda tres cifras; aquí no se preguntan. Vacías
        // significan "no lo sé", que es exactamente lo que sabemos de esta
        // persona, así que el resto del proceso funciona igual.
        fd.set("inversion", "");
        fd.set("pacientes", "");
        fd.set("ticket", "");
        fd.set("origen", "hero");
        fd.set("website", honeypot.current?.value ?? "");
        fd.set("formLoadedAt", String(cargadoEn.current));
        const eventId = newEventId();
        fd.set("eventId", eventId);
        fd.set("sourceUrl", window.location.href);
        appendUtms(fd);
        setError(null);
        iniciar(async () => {
          const res = await requestGrowth(fd);
          if (!res.ok) {
            setError(res.error ?? "No se pudo enviar. Inténtalo de nuevo.");
            return;
          }
          pushUserData({
            email: String(fd.get("email") ?? ""),
            phone: String(fd.get("phone") ?? ""),
          });
          track("generate_lead", { form_location: "growth_hero" });
          trackMetaLead(eventId);
          setEnviado(true);
        });
      }}
    >
      <span
        aria-hidden
        className="absolute -right-3 -top-4 rotate-[-7deg] rounded-full px-4 py-1.5 text-sm font-black"
        style={{ background: T.lime, color: TINTA, boxShadow: "0 8px 20px -8px rgba(0,0,0,0.7)" }}
      >
        Te llamamos hoy
      </span>

      <p className="text-2xl font-black leading-[1.15] tracking-[-0.01em]">
        Cuéntanos quién eres
        <br />y te llamamos
      </p>

      <div className="mt-5 space-y-3.5">
        <label className="block">
          <span className="sr-only">Nombre</span>
          <input
            name="name"
            required
            placeholder="Nombre"
            autoComplete="name"
            className={campo}
            style={estiloCampo}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="sr-only">Teléfono</span>
            <input
              name="phone"
              type="tel"
              required
              placeholder="Teléfono"
              autoComplete="tel"
              className={campo}
              style={estiloCampo}
            />
          </label>
          <label className="block">
            <span className="sr-only">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              autoComplete="email"
              className={campo}
              style={estiloCampo}
            />
          </label>
        </div>

        <label className="block">
          <span className="sr-only">Tipo de centro</span>
          <select name="sector" required defaultValue="" className={campo} style={estiloCampo}>
            <option value="" disabled>
              ¿Qué tipo de centro tienes?
            </option>
            {SECTORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label
          className="flex items-start gap-3 text-xs leading-relaxed"
          style={{ color: "rgba(11,27,43,0.6)" }}
        >
          <input
            name="consent"
            type="checkbox"
            value="true"
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#08090C]"
          />
          <span>
            Acepto que dinkbit me contacte y me envíe comunicaciones comerciales, según la{" "}
            <Link
              href="/privacidad"
              className="font-bold underline underline-offset-2"
              style={{ color: TINTA }}
            >
              política de privacidad
            </Link>
            .
          </span>
        </label>
      </div>

      {/* Trampa para robots: invisible y fuera del orden de tabulación. Si
          viene rellena, el servidor descarta el envío. */}
      <input
        ref={honeypot}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <button
        type="submit"
        disabled={pendiente}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full py-4 text-lg font-bold transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: TINTA, color: T.lime }}
      >
        {pendiente ? "Enviando…" : "Quiero que me llaméis"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-bold" style={{ color: "#B4321F" }}>
          {error}
        </p>
      )}
    </form>
  );
}

const campo =
  "w-full rounded-xl px-4 py-3.5 text-base outline-none transition placeholder:text-[rgba(11,27,43,0.45)] focus:border-[rgba(11,27,43,0.5)]";

const estiloCampo = {
  background: "#FFFFFF",
  border: `1px solid ${BORDE}`,
  color: TINTA,
} as const;
