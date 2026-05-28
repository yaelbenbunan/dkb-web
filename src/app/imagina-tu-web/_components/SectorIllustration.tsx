"use client";

import type { CSSProperties } from "react";

interface Props {
  sector: string;
  paletteAccent: string;
  paletteSurface: string;
  className?: string;
}

export function SectorIllustration({
  sector,
  paletteAccent,
  paletteSurface,
  className,
}: Props) {
  const style: CSSProperties = { color: paletteAccent, backgroundColor: paletteSurface };
  return (
    <div
      className={className ?? "flex aspect-video items-center justify-center rounded-lg"}
      style={style}
      aria-hidden
    >
      {renderSvg(sector)}
    </div>
  );
}

function renderSvg(sector: string) {
  const common = {
    width: 96,
    height: 96,
    viewBox: "0 0 96 96",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (sector) {
    case "salud":
      return (
        <svg {...common}>
          <path d="M48 22v52M22 48h52" />
          <rect x="16" y="16" width="64" height="64" rx="14" />
        </svg>
      );
    case "educacion":
      return (
        <svg {...common}>
          <path d="M16 38l32-14 32 14-32 14L16 38z" />
          <path d="M30 46v18c0 4 8 8 18 8s18-4 18-8V46" />
          <path d="M80 38v22" />
        </svg>
      );
    case "restauracion":
      return (
        <svg {...common}>
          <path d="M32 16v28a8 8 0 0 0 8 8h0a8 8 0 0 0 8-8V16" />
          <path d="M40 16v22" />
          <path d="M64 16c-6 6-6 24 0 30v32" />
        </svg>
      );
    case "moda":
      return (
        <svg {...common}>
          <path d="M48 18a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
          <path d="M48 30L18 60h12l4 22h28l4-22h12L48 30z" />
        </svg>
      );
    case "tecnologia":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="6" />
          <circle cx="72" cy="24" r="6" />
          <circle cx="48" cy="72" r="6" />
          <path d="M30 24h36M28 28L46 66M68 28L50 66" />
        </svg>
      );
    case "servicios":
      return (
        <svg {...common}>
          <rect x="14" y="30" width="68" height="48" rx="6" />
          <path d="M36 30v-8a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v8" />
          <path d="M14 52h68" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="48" cy="48" r="28" />
          <circle cx="48" cy="48" r="14" />
        </svg>
      );
  }
}
