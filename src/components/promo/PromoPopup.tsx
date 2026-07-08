"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { subscribePromo } from "@/lib/promo-subscribe-action";
import { shouldShowPopup, markPopupSeen } from "@/lib/promo-popup-storage";
import { PROMO, isPromoActive } from "@/lib/promo-config";

type View = "hidden" | "form" | "success";

export function PromoPopup() {
  const pathname = usePathname();
  const [view, setView] = useState<View>("hidden");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loadedAt = useRef(0);

  useEffect(() => {
    // No mostrar en la ruta del cuestionario, ni fuera de la ventana de promo,
    // ni si la frecuencia lo impide.
    if (pathname?.startsWith(PROMO.questionnairePath)) return;
    if (!isPromoActive(Date.now())) return;
    if (!shouldShowPopup(Date.now(), PROMO.frequencyDays, window.localStorage)) return;
    const id = window.setTimeout(() => {
      loadedAt.current = Date.now();
      setView("form");
    }, PROMO.showDelayMs);
    return () => window.clearTimeout(id);
  }, [pathname]);

  if (view === "hidden") return null;

  const dismiss = () => {
    markPopupSeen(Date.now(), window.localStorage);
    setView("hidden");
  };

  const onSubmit = (formData: FormData) => {
    setError(null);
    formData.set("formLoadedAt", String(loadedAt.current));
    startTransition(async () => {
      const res = await subscribePromo(formData);
      if (res.ok) {
        markPopupSeen(Date.now(), window.localStorage);
        setView("success");
      } else {
        setError(res.error ?? "No se pudo completar. Inténtalo de nuevo.");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Promoción de verano"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md rounded-2xl border border-border-strong/80 bg-bg-elevated p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] sm:p-8">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-fg-muted hover:text-fg"
        >
          ✕
        </button>

        {view === "success" ? (
          <div className="text-center">
            <p className="text-2xl">📩</p>
            <h2 className="mt-2 text-xl font-bold text-fg">¡Listo!</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Revisa tu correo: te hemos enviado los detalles de la promoción de verano.
            </p>
            <button
              type="button"
              onClick={() => setView("hidden")}
              className="mt-5 h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form action={onSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">
                Promo Verano · -{PROMO.discountPct}%
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-fg">
                Este verano, tu web o ecommerce al {PROMO.discountPct}% 🌴
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Déjanos tu email y te enviamos toda la info de la promoción.
              </p>
            </div>

            {/* Honeypot: invisible para humanos */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <input
              type="email"
              name="email"
              required
              placeholder="Tu email"
              className="h-11 rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent"
            />

            <label className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                He leído y acepto la{" "}
                <Link href="/privacidad" className="font-semibold text-accent hover:underline">
                  política de privacidad
                </Link>{" "}
                y el envío de comunicaciones comerciales.
              </span>
            </label>

            {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={!consent || pending}
              className="h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Quiero la info"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
