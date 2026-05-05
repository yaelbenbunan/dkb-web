"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONSENT_OPEN_EVENT,
  acceptAll,
  rejectAll,
  readConsent,
  writeConsent,
} from "@/lib/cookies-consent";

type View = "banner" | "settings" | "hidden";

export function CookieBanner() {
  const [view, setView] = useState<View>("hidden");
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (!stored) {
      setView("banner");
    } else {
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    }
    const open = () => {
      const current = readConsent();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
      }
      setView("settings");
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  if (view === "hidden") return null;

  const handleAcceptAll = () => {
    acceptAll();
    setView("hidden");
  };
  const handleRejectAll = () => {
    rejectAll();
    setView("hidden");
  };
  const handleSavePrefs = () => {
    writeConsent({ analytics, marketing });
    setView("hidden");
  };

  return (
    <div
      role="dialog"
      aria-modal={view === "settings"}
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:bottom-6 sm:px-6"
    >
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border-strong/80 bg-bg-elevated/95 p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-6">
        {view === "banner" ? (
          <BannerView
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onConfigure={() => setView("settings")}
          />
        ) : (
          <SettingsView
            analytics={analytics}
            marketing={marketing}
            onAnalyticsChange={setAnalytics}
            onMarketingChange={setMarketing}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onSave={handleSavePrefs}
          />
        )}
      </div>
    </div>
  );
}

function BannerView({
  onAcceptAll,
  onRejectAll,
  onConfigure,
}: {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onConfigure: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold text-fg">
          Usamos cookies en este sitio 🍪
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Utilizamos cookies propias y de terceros para fines técnicos,
          analíticos y de marketing. Puedes aceptarlas todas, rechazarlas o
          configurar tus preferencias. Más info en nuestra{" "}
          <Link
            href="/cookies"
            className="font-semibold text-accent hover:underline"
          >
            Política de Cookies
          </Link>{" "}
          y{" "}
          <Link
            href="/privacidad"
            className="font-semibold text-accent hover:underline"
          >
            Política de Privacidad
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={onConfigure}
          className="h-11 rounded-lg border border-border-strong bg-transparent px-4 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle sm:order-1"
        >
          Configurar
        </button>
        <button
          type="button"
          onClick={onRejectAll}
          className="h-11 rounded-lg border border-border-strong bg-transparent px-4 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle sm:order-2"
        >
          Rechazar todas
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="h-11 rounded-lg bg-[#187bef] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#3a90f2] sm:order-3"
        >
          Aceptar todas
        </button>
      </div>
    </div>
  );
}

function SettingsView({
  analytics,
  marketing,
  onAnalyticsChange,
  onMarketingChange,
  onAcceptAll,
  onRejectAll,
  onSave,
}: {
  analytics: boolean;
  marketing: boolean;
  onAnalyticsChange: (v: boolean) => void;
  onMarketingChange: (v: boolean) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-base font-semibold text-fg">
          Preferencias de cookies
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Elige qué categorías quieres permitir. Puedes cambiar tu elección en
          cualquier momento desde el enlace del pie de página.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ToggleRow
          title="Necesarias"
          description="Imprescindibles para el funcionamiento del sitio. No se pueden desactivar."
          checked={true}
          disabled
        />
        <ToggleRow
          title="Análisis"
          description="Nos ayudan a entender cómo se usa la web (Google Analytics)."
          checked={analytics}
          onChange={onAnalyticsChange}
        />
        <ToggleRow
          title="Marketing"
          description="Permiten mostrar publicidad relevante y medir campañas (Meta Pixel, Google Ads)."
          checked={marketing}
          onChange={onMarketingChange}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={onRejectAll}
          className="h-11 rounded-lg border border-border-strong bg-transparent px-4 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle"
        >
          Rechazar todas
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="h-11 rounded-lg border border-border-strong bg-transparent px-4 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle"
        >
          Aceptar todas
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-11 rounded-lg bg-[#187bef] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#3a90f2]"
        >
          Guardar selección
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-bg-subtle/50 p-4">
      <div>
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
      <label
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#187bef]" : "bg-border-strong"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only"
        />
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </label>
    </div>
  );
}
