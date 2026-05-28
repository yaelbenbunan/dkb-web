"use client";

import type { CSSProperties } from "react";
import {
  getPalette,
  getTypography,
} from "@/lib/preview-themes";
import type { CopyResponse } from "@/lib/preview-validation";
import { SectorIllustration } from "../SectorIllustration";

export interface EcommerceData {
  businessName: string;
  sector: string;
  ecommerceKind?: "productos" | "servicios";
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
}

interface Props {
  data: EcommerceData;
  copy: CopyResponse | null;
  heroImageDataUrl: string | null;
}

export function EcommerceTemplate({ data, copy, heroImageDataUrl }: Props) {
  const palette = getPalette(data.palette);
  const typo = getTypography(data.typography);
  if (!palette || !typo) return null;

  const wrapper: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: `var(${typo.bodyVar}), system-ui, sans-serif`,
  };
  const display: CSSProperties = {
    fontFamily: `var(${typo.displayVar}), system-ui, sans-serif`,
  };
  const accentBtn: CSSProperties = {
    backgroundColor: palette.accent,
    color: "#fff",
  };

  const isProducts = (data.ecommerceKind ?? "productos") === "productos";
  const headline = copy?.heroHeadline ?? data.businessName;
  const tagline = copy?.heroTagline ?? data.valueProp;
  const ctaText = copy?.ctaText ?? (isProducts ? "Ver productos" : "Reservar");
  const sectionTitle =
    copy?.sectionTitle ?? (isProducts ? "Nuestros productos" : "Nuestros servicios");
  const offerings =
    copy?.offerings ?? data.offerings.map((name) => ({ name, blurb: "" }));

  const heroBg: CSSProperties = heroImageDataUrl
    ? {
        backgroundImage: `linear-gradient(135deg, ${withAlpha(palette.bg, 0.7)} 0%, ${withAlpha(palette.bg, 0.45)} 60%, ${withAlpha(palette.bg, 0.85)} 100%), url(${heroImageDataUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: palette.heroGradient };

  return (
    <div style={wrapper}>
      {/* Full-width hero */}
      <section style={heroBg} className="px-6 py-20 sm:px-12 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] opacity-80"
            style={display}
          >
            {data.businessName}
          </p>
          <h1
            style={display}
            className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            {headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed opacity-90">
            {tagline}
          </p>
          <button
            type="button"
            style={accentBtn}
            className="mt-7 inline-flex h-12 items-center rounded-lg px-7 text-sm font-semibold shadow-md"
          >
            {ctaText} →
          </button>
        </div>
      </section>

      {/* Product/service grid */}
      <section className="px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2
            style={display}
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {sectionTitle}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o, i) => (
              <article
                key={i}
                style={{ backgroundColor: palette.surface }}
                className="overflow-hidden rounded-xl shadow-sm transition hover:shadow-lg"
              >
                <SectorIllustration
                  sector={data.sector}
                  paletteAccent={palette.accent}
                  paletteSurface={withAlpha(palette.accent, 0.08)}
                  className="flex aspect-[4/3] items-center justify-center"
                />
                <div className="p-5">
                  <p style={display} className="text-lg font-semibold">
                    {o.name}
                  </p>
                  {o.blurb && (
                    <p className="mt-1 text-sm leading-relaxed opacity-75">
                      {o.blurb}
                    </p>
                  )}
                  {isProducts && (
                    <p
                      className="mt-3 text-sm font-bold"
                      style={{ color: palette.accent }}
                    >
                      desde 19€
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section
        style={{ backgroundColor: palette.surface }}
        className="px-6 py-14 sm:px-12 sm:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 style={display} className="text-2xl font-bold sm:text-3xl">
            Por qué nosotros
          </h2>
          <p className="mt-4 text-base leading-relaxed opacity-90">
            {tagline}
          </p>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h2 style={display} className="text-2xl font-bold sm:text-3xl">
            ¿Hablamos?
          </h2>
          <p className="opacity-80">Estamos a un mensaje de distancia.</p>
          <button
            type="button"
            style={accentBtn}
            className="inline-flex h-12 items-center rounded-lg px-6 text-sm font-semibold"
          >
            Escríbenos
          </button>
        </div>
      </section>

      <footer
        className="border-t px-6 py-6 text-xs opacity-70 sm:px-12"
        style={{ borderColor: palette.accent + "22" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {data.businessName}
          </span>
          <span className="flex gap-4">
            <span>Inicio</span>
            <span>Tienda</span>
            <span>Contacto</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
