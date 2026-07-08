"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PromoEmailForm } from "@/components/promo/PromoEmailForm";
import { shouldShowPopup, markPopupSeen } from "@/lib/promo-popup-storage";
import { PROMO, isPromoActive } from "@/lib/promo-config";

export function PromoPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // No mostrar en las rutas de la promo (landing/cuestionario), ni fuera de
    // la ventana de promo, ni si la frecuencia lo impide.
    if (pathname?.startsWith(PROMO.landingPath)) return;
    if (!isPromoActive(Date.now())) return;
    if (!shouldShowPopup(Date.now(), PROMO.frequencyDays, window.localStorage)) return;
    const id = window.setTimeout(() => setOpen(true), PROMO.showDelayMs);
    return () => window.clearTimeout(id);
  }, [pathname]);

  if (!open) return null;

  const dismiss = () => {
    markPopupSeen(Date.now(), window.localStorage);
    setOpen(false);
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

        <div className="mb-4">
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

        {/* Al enviarse con éxito, marcamos la frecuencia para no repetir el popup */}
        <PromoEmailForm onSuccess={() => markPopupSeen(Date.now(), window.localStorage)} />

        <p className="mt-4 text-center text-xs text-fg-muted">
          <Link
            href={PROMO.landingPath}
            onClick={dismiss}
            className="font-semibold text-accent hover:underline"
          >
            Más información sobre la promoción →
          </Link>
        </p>
      </div>
    </div>
  );
}
