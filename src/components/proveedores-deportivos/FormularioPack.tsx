"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { trackChatGptLead } from "@/lib/chatgpt-pixel";
import { pushUserData, track } from "@/lib/gtm";
import { newEventId, trackMetaLead } from "@/lib/meta-pixel";
import { enviarSolicitudPack } from "@/lib/proveedores-deportivos-action";
import {
  PD_DESTINOS,
  PD_FACTURACION,
  PD_GRACIAS_PATH,
  PD_MUESTRAS,
  PD_PRESUPUESTO,
  PD_PRODUCTOS,
  pasoUnoSchema,
  type ErroresSolicitud,
} from "@/lib/proveedores-deportivos";
import { appendUtms } from "@/lib/utm";
import { PD } from "./tema";

/**
 * Formulario del hero, en dos pasos: los datos de contacto primero (lo que hace
 * falta para no perder el lead) y la cualificación después. Once campos de
 * golpe en un móvil echan para atrás; cinco y luego seis, no tanto.
 *
 * Los dos pasos están SIEMPRE en el DOM y el inactivo va con `hidden`: así
 * volver atrás no borra nada y el envío lleva todos los campos sin tener que
 * guardarlos en estado.
 */

const CAMPOS_PASO_UNO = ["nombre", "empresa", "web", "email", "telefono"] as const;

const inputClass = "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[16px] outline-none transition-colors focus:border-[#4DA3FF]";
const inputStyle = { background: PD.campo, borderColor: PD.linea, color: PD.texto } as const;
const etiquetaClass = "text-[12px] font-bold uppercase tracking-[0.08em]";

function Error({ texto }: { texto?: string }) {
  return texto ? (
    <p className="mt-1 text-[13px] font-semibold" style={{ color: PD.error }}>
      {texto}
    </p>
  ) : null;
}

function Campo(props: { name: (typeof CAMPOS_PASO_UNO)[number]; label: string; type?: string; placeholder: string; autoComplete?: string; error?: string }) {
  return (
    <div>
      <label className="block">
        <span className={etiquetaClass} style={{ color: PD.suave }}>
          {props.label}
        </span>
        <input
          name={props.name}
          type={props.type ?? "text"}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          aria-invalid={props.error ? true : undefined}
          className={inputClass}
          style={inputStyle}
        />
      </label>
      <Error texto={props.error} />
    </div>
  );
}

function Desplegable(props: { name: string; label: string; opciones: readonly { valor: string; etiqueta: string }[]; error?: string }) {
  return (
    <div>
      <label className="block">
        <span className={etiquetaClass} style={{ color: PD.suave }}>
          {props.label}
        </span>
        <select name={props.name} defaultValue="" aria-invalid={props.error ? true : undefined} className={inputClass} style={inputStyle}>
          <option value="" disabled>
            Elige una opción
          </option>
          {props.opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <Error texto={props.error} />
    </div>
  );
}

export function FormularioPack({ id = "solicitud" }: { id?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [errores, setErrores] = useState<ErroresSolicitud>({});
  const [aviso, setAviso] = useState<{ error: string; whatsapp?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // Freno síncrono contra el doble clic: `pending` tarda un render en llegar.
  const enviando = useRef(false);

  function siguiente() {
    const fd = new FormData(formRef.current!);
    const r = pasoUnoSchema.safeParse(Object.fromEntries(CAMPOS_PASO_UNO.map((k) => [k, String(fd.get(k) ?? "")])));
    if (!r.success) {
      const e: ErroresSolicitud = {};
      for (const i of r.error.issues) e[i.path[0] as keyof ErroresSolicitud] ??= i.message;
      setErrores(e);
      return;
    }
    setErrores({});
    setPaso(2);
  }

  function enviar(fd: FormData) {
    if (enviando.current) return;
    enviando.current = true;
    // El mismo eventId para el píxel y para CAPI: si llegan los dos, Meta cuenta uno.
    const eventId = newEventId();
    fd.set("eventId", eventId);
    fd.set("pageUrl", window.location.href);
    appendUtms(fd);
    setAviso(null);
    startTransition(async () => {
      const r = await enviarSolicitudPack(fd);
      if (r.ok) {
        pushUserData({ email: String(fd.get("email") ?? ""), phone: String(fd.get("telefono") ?? "") });
        track("generate_lead", { form_location: "proveedores_deportivos" });
        trackMetaLead(eventId);
        trackChatGptLead(eventId);
        router.push(PD_GRACIAS_PATH);
        return;
      }
      enviando.current = false;
      setErrores(r.errores ?? {});
      if (r.errores && CAMPOS_PASO_UNO.some((k) => r.errores?.[k])) setPaso(1);
      setAviso({ error: r.error, whatsapp: r.whatsapp });
    });
  }

  return (
    <form
      id={id}
      ref={formRef}
      action={enviar}
      noValidate
      className="relative scroll-mt-24 rounded-2xl p-5 sm:p-7"
      style={{
        background: PD.superficie,
        border: `2px solid ${PD.acento}`,
        boxShadow: "0 0 0 6px rgba(24,123,239,.15), 0 30px 80px -30px rgba(24,123,239,.55)",
        color: PD.texto,
      }}
    >
      <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: PD.suave }}>
        <span>Paso {paso} de 2</span>
        <span>{paso === 1 ? "Tus datos" : "Tu negocio"}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progreso del formulario"
        aria-valuemin={1}
        aria-valuemax={2}
        aria-valuenow={paso}
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ background: PD.linea }}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: paso === 1 ? "50%" : "100%", background: PD.acento }} />
      </div>

      <div hidden={paso !== 1} className="mt-5 space-y-4">
        <Campo name="nombre" label="Nombre y apellidos" placeholder="Laura Gómez" autoComplete="name" error={errores.nombre} />
        <Campo name="empresa" label="Empresa" placeholder="Nombre de tu marca o distribuidora" autoComplete="organization" error={errores.empresa} />
        <Campo name="web" label="Web o Instagram de la marca" placeholder="tumarca.com o @tumarca" autoComplete="url" error={errores.web} />
        <Campo name="email" label="Email" type="email" placeholder="tu@empresa.com" autoComplete="email" error={errores.email} />
        <Campo name="telefono" label="Teléfono / WhatsApp" type="tel" placeholder="600 000 000" autoComplete="tel" error={errores.telefono} />
        <button
          type="button"
          onClick={siguiente}
          className="min-h-[52px] w-full rounded-xl px-6 text-[17px] font-extrabold uppercase tracking-[0.04em] text-white transition-transform hover:-translate-y-0.5"
          style={{ background: PD.acento }}
        >
          Siguiente →
        </button>
      </div>

      <div hidden={paso !== 2} className="mt-5 space-y-4">
        <Desplegable name="producto" label="¿Qué vendes?" opciones={PD_PRODUCTOS} error={errores.producto} />

        <fieldset>
          <legend className={etiquetaClass} style={{ color: PD.suave }}>
            ¿A quién quieres vender?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PD_DESTINOS.map((d) => (
              <label key={d.valor} className="cursor-pointer">
                <input type="checkbox" name="destinos" value={d.valor} className="peer sr-only" />
                <span
                  className="inline-block rounded-full border px-3.5 py-2 text-[14px] font-semibold transition-colors peer-checked:border-[#187bef] peer-checked:bg-[#187bef] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#4DA3FF]"
                  style={{ borderColor: PD.linea, color: PD.suave }}
                >
                  {d.etiqueta}
                </span>
              </label>
            ))}
          </div>
          <Error texto={errores.destinos} />
        </fieldset>

        <Desplegable name="facturacion" label="Facturación anual aproximada" opciones={PD_FACTURACION} error={errores.facturacion} />

        <fieldset>
          <legend className={etiquetaClass} style={{ color: PD.suave }}>
            ¿Podéis enviar muestras gratuitas?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PD_MUESTRAS.map((o) => (
              <label key={o.valor} className="cursor-pointer">
                <input type="radio" name="muestras" value={o.valor} className="peer sr-only" />
                <span
                  className="inline-block rounded-full border px-3.5 py-2 text-[14px] font-semibold transition-colors peer-checked:border-[#187bef] peer-checked:bg-[#187bef] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#4DA3FF]"
                  style={{ borderColor: PD.linea, color: PD.suave }}
                >
                  {o.etiqueta}
                </span>
              </label>
            ))}
          </div>
          <Error texto={errores.muestras} />
        </fieldset>

        <Desplegable name="presupuesto" label="Presupuesto mensual para publicidad" opciones={PD_PRESUPUESTO} error={errores.presupuesto} />

        <div>
          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: PD.suave }}>
            <input type="checkbox" name="privacidad" className="mt-0.5 h-4 w-4 shrink-0 accent-[#187bef]" />
            <span>
              He leído y acepto la{" "}
              <a href="/privacidad" target="_blank" rel="noopener" className="underline" style={{ color: PD.acentoClaro }}>
                política de privacidad
              </a>
              .
            </span>
          </label>
          <Error texto={errores.privacidad} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="min-h-[56px] w-full rounded-xl px-6 text-[18px] font-extrabold uppercase tracking-[0.04em] text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: PD.acento }}
        >
          {pending ? "Enviando…" : "QUIERO MI PACK"}
        </button>
        <div className="flex items-center justify-between text-[13px]" style={{ color: PD.suave }}>
          <button type="button" onClick={() => setPaso(1)} className="underline underline-offset-4">
            ← Volver
          </button>
          <span>Te respondemos en menos de 24 h</span>
        </div>
      </div>

      {/* Trampa para bots: fuera de la vista pero sin `display:none`, que algunos detectan. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No rellenar
          <input name="website_url" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {aviso && (
        <div role="alert" className="mt-4 rounded-xl p-3 text-[14px] font-semibold" style={{ background: "rgba(255,107,107,.1)", color: PD.error }}>
          {aviso.error}{" "}
          {aviso.whatsapp && (
            <a href={aviso.whatsapp} target="_blank" rel="noopener" className="underline" style={{ color: PD.texto }}>
              Escríbenos por WhatsApp
            </a>
          )}
        </div>
      )}
    </form>
  );
}
