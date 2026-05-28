"use client";

import type { CSSProperties } from "react";
import {
  getPalette,
  getTypography,
} from "@/lib/preview-themes";
import type { CopyResponse } from "@/lib/preview-validation";

export interface InformativaData {
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
}

interface Props {
  data: InformativaData;
  copy: CopyResponse | null;
  heroImageDataUrl: string | null;
}

export function InformativaTemplate({ data, copy, heroImageDataUrl }: Props) {
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
  const heroFallback: CSSProperties = {
    background: palette.heroGradient,
  };

  const headline = copy?.heroHeadline ?? data.businessName;
  const tagline = copy?.heroTagline ?? data.valueProp;
  const ctaText = copy?.ctaText ?? "Contáctanos";
  const sectionTitle = copy?.sectionTitle ?? "Lo que hacemos";
  const offerings =
    copy?.offerings ?? data.offerings.map((name) => ({ name, blurb: "" }));

  return (
    <div style={wrapper}>
      {/* Hero split */}
      <section className="px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] opacity-70"
              style={display}
            >
              {data.businessName}
            </p>
            <h1
              style={display}
              className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              {headline}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed opacity-90">
              {tagline}
            </p>
            <button
              type="button"
              style={accentBtn}
              className="mt-8 inline-flex h-12 items-center rounded-lg px-7 text-sm font-semibold shadow-md"
            >
              {ctaText} →
            </button>
          </div>
          <div className="relative">
            {heroImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageDataUrl}
                alt=""
                className="aspect-[3/4] w-full rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <div
                style={heroFallback}
                className="aspect-[3/4] w-full rounded-2xl shadow-2xl"
                aria-hidden
              />
            )}
          </div>
        </div>
      </section>

      {/* Numbered services list */}
      <section className="px-6 py-12 sm:px-12 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2
            style={display}
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {sectionTitle}
          </h2>
          <ul className="divide-y" style={{ borderColor: palette.accent + "33" }}>
            {offerings.map((o, i) => (
              <li
                key={i}
                className="grid grid-cols-[auto_1fr] gap-6 py-6 sm:gap-10"
                style={{ borderColor: palette.accent + "33" }}
              >
                <span
                  className="text-sm font-mono opacity-60"
                  style={display}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p style={display} className="text-xl font-semibold">
                    {o.name}
                  </p>
                  {o.blurb && (
                    <p className="mt-1 text-sm leading-relaxed opacity-80">
                      {o.blurb}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA band */}
      <section
        style={{ backgroundColor: palette.surface }}
        className="px-6 py-14 sm:px-12 sm:py-20"
      >
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

      {/* Footer */}
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
            <span>Sobre nosotros</span>
            <span>Contacto</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
