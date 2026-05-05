"use client";

import { CONSENT_OPEN_EVENT } from "@/lib/cookies-consent";

interface Props {
  variant?: "primary" | "link";
  className?: string;
  children?: React.ReactNode;
}

export function CookieSettingsButton({
  variant = "primary",
  className = "",
  children = "Gestionar preferencias de cookies",
}: Props) {
  const open = () => {
    window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
  };

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={open}
        className={`text-left transition-colors hover:text-accent ${
          className || "text-xs text-fg-dim"
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`mt-2 inline-flex h-11 items-center justify-center rounded-lg border border-border-strong bg-transparent px-5 text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle ${className}`}
    >
      {children}
    </button>
  );
}
