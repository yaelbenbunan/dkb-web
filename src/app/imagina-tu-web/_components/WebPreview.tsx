"use client";

import type { CSSProperties } from "react";
import {
  getPalette,
  getTypography,
  SECTOR_ICONS,
} from "@/lib/preview-themes";

export interface WebPreviewData {
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: "productos" | "servicios";
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
}

interface Props {
  data: WebPreviewData;
}

export function WebPreview({ data }: Props) {
  const palette = getPalette(data.palette);
  const typo = getTypography(data.typography);
  if (!palette || !typo) return null;

  const isEcomProducts =
    data.businessType === "ecommerce" && data.ecommerceKind === "productos";
  const icon =
    (SECTOR_ICONS as Record<string, string>)[data.sector] ?? SECTOR_ICONS.otro;

  const wrapperStyle: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: `var(${typo.bodyVar}), system-ui, sans-serif`,
  };
  const displayStyle: CSSProperties = {
    fontFamily: `var(${typo.displayVar}), system-ui, sans-serif`,
  };
  const heroStyle: CSSProperties = {
    background: palette.heroGradient,
  };
  const accentBtnStyle: CSSProperties = {
    backgroundColor: palette.accent,
    color: "#fff",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-4 py-2.5">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-yellow-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-fg-muted">
          {data.businessName.toLowerCase().replace(/\s+/g, "")}.es
        </span>
      </div>

      <div style={wrapperStyle}>
        {/* Hero */}
        <section style={heroStyle} className="px-6 py-16 sm:px-12 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-3 text-sm font-medium opacity-80" style={displayStyle}>
              {data.businessName}
            </p>
            <h1
              style={displayStyle}
              className="text-3xl font-bold leading-tight sm:text-5xl"
            >
              {data.valueProp}
            </h1>
            <button
              type="button"
              style={accentBtnStyle}
              className="mt-8 inline-flex h-12 items-center rounded-lg px-6 text-sm font-semibold shadow-md"
            >
              Contáctanos
            </button>
          </div>
        </section>

        {/* Offerings grid */}
        <section className="px-6 py-12 sm:px-12 sm:py-16">
          <h2
            style={displayStyle}
            className="mb-8 text-center text-2xl font-bold sm:text-3xl"
          >
            {data.businessType === "ecommerce" && data.ecommerceKind === "productos"
              ? "Nuestros productos"
              : "Lo que ofrecemos"}
          </h2>
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.offerings.map((item, i) => (
              <article
                key={i}
                style={{ backgroundColor: palette.surface }}
                className="rounded-xl p-6 shadow-sm"
              >
                <div
                  style={{ background: palette.heroGradient }}
                  className="mb-4 flex aspect-video items-center justify-center rounded-lg text-4xl"
                >
                  {icon}
                </div>
                <h3
                  style={displayStyle}
                  className="text-lg font-semibold"
                >
                  {item}
                </h3>
                {isEcomProducts && (
                  <p
                    className="mt-1 text-sm font-medium"
                    style={{ color: palette.accent }}
                  >
                    desde 19€
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section
          style={{ backgroundColor: palette.surface }}
          className="px-6 py-12 sm:px-12 sm:py-16"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
            <h2 style={displayStyle} className="text-2xl font-bold sm:text-3xl">
              ¿Hablamos?
            </h2>
            <p className="opacity-80">Estamos a un mensaje de distancia.</p>
            <button
              type="button"
              style={accentBtnStyle}
              className="inline-flex h-12 items-center rounded-lg px-6 text-sm font-semibold"
            >
              Escríbenos
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t px-6 py-6 text-xs opacity-70 sm:px-12">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} {data.businessName}
            </span>
            <span className="flex gap-4">
              <span>Inicio</span>
              <span>Sobre nosotros</span>
              <span>Contacto</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
