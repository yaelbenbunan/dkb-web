"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "dkb-theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.dataset.theme;
  return t === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage puede fallar en private mode — el cambio en memoria sigue OK
    }
    setTheme(next);
  }

  // Antes del mount mostramos el icono de luna para que el SSR coincida con el
  // estado por defecto (dark). Tras el mount real reflejamos el tema activo.
  const showSun = mounted && theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={showSun ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-bg-elevated px-4 text-sm font-medium text-fg-muted transition-colors hover:border-[#187bef]/50 hover:text-fg"
    >
      {showSun ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M5.6 18.4l1.4-1.4m10-10l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span>{showSun ? "Modo claro" : "Modo oscuro"}</span>
    </button>
  );
}
