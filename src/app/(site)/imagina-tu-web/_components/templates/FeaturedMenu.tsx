"use client";

import { type CSSProperties } from "react";
import { motion } from "motion/react";
import type { FeaturedMenu as FeaturedMenuData } from "./sector-assets";

/** Carta layout per template:
 *  - "photo-center": photo in an oval frame between the two menu columns
 *    (used by the Moderno template).
 *  - "photo-aside": a generic photo on the left, every dish on the right in
 *    two columns (used by the Editorial template).
 *  - "no-photo": no photo, just the dishes with prices (used by the Compacto
 *    template). */
export type FeaturedMenuVariant = "photo-center" | "photo-aside" | "no-photo";

interface Palette {
  bg: string;
  surface: string;
  accent: string;
  text: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" } as const,
  transition: {
    duration: 0.6,
    ease: [0.21, 1, 0.34, 1] as [number, number, number, number],
  },
};

interface MenuItem {
  name: string;
  desc: string;
  price: string;
}

function MenuColumn({
  title,
  items,
  palette,
  display,
  fg,
}: {
  title: string;
  items: MenuItem[];
  palette: { accent: string };
  display: CSSProperties;
  fg: string;
}) {
  return (
    <div>
      <h3
        style={{ ...display, color: fg }}
        className="text-center text-xs font-bold uppercase tracking-[0.36em]"
      >
        {title}
      </h3>
      <div
        aria-hidden
        className="mx-auto mt-3 h-px w-16"
        style={{ backgroundColor: palette.accent + "66" }}
      />
      <ul className="mt-10 space-y-7">
        {items.map((it, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-4">
              <p
                style={{ ...display, color: fg }}
                className="text-base font-semibold uppercase tracking-[0.08em]"
              >
                {it.name}
              </p>
              <span
                style={{ ...display, color: palette.accent }}
                className="text-sm font-semibold whitespace-nowrap"
              >
                {it.price}
              </span>
            </div>
            <p
              className="mt-1.5 text-[15px] leading-relaxed opacity-75"
              style={{ color: fg }}
            >
              {it.desc}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  variant: FeaturedMenuVariant;
  /** Resolved menu (AI carta or static fallback). */
  menu: FeaturedMenuData;
  /** A single cuisine photo. Ignored by the "no-photo" variant. */
  photo?: string;
  palette: Palette;
  /** Display-font style applied to titles/dish names. */
  display: CSSProperties;
  /** Text colour that reads on the section surface. */
  fg: string;
  /** Tightens vertical padding for the Compacto template. */
  density?: "spacious" | "compact";
}

export function FeaturedMenu({
  variant,
  menu,
  photo,
  palette,
  display,
  fg,
  density = "spacious",
}: Props) {
  const padY = density === "compact" ? "py-16" : "py-28";

  const leftCol = (
    <MenuColumn
      title={menu.leftTitle}
      items={menu.leftItems}
      palette={palette}
      display={display}
      fg={fg}
    />
  );
  const rightCol = (
    <MenuColumn
      title={menu.rightTitle}
      items={menu.rightItems}
      palette={palette}
      display={display}
      fg={fg}
    />
  );

  return (
    <section
      className={`relative overflow-hidden px-12 ${padY}`}
      style={{
        background: `linear-gradient(180deg, ${palette.surface} 0%, ${palette.accent}0d 100%)`,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          {...fadeUp}
          style={{ ...display, color: fg }}
          className="text-center text-5xl font-bold tracking-[0.04em]"
        >
          Carta destacada
        </motion.h2>
        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="mx-auto mt-3 max-w-xl text-center opacity-70"
          style={{ color: fg }}
        >
          Una selección de platos que define nuestra cocina y la mesa que
          ofrecemos.
        </motion.p>

        {variant === "photo-center" && (
          <div className="mt-16 grid items-start gap-12 lg:grid-cols-[1fr_auto_1fr]">
            {leftCol}
            <OvalPhoto photo={photo} palette={palette} />
            {rightCol}
          </div>
        )}

        {variant === "photo-aside" && (
          <div className="mt-16 grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -m-2 rounded-3xl"
                style={{
                  background: `linear-gradient(135deg, ${palette.accent}55, transparent)`,
                  filter: "blur(24px)",
                }}
              />
              {photo && (
                <div
                  className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border-2 shadow-2xl"
                  style={{ borderColor: palette.accent + "44" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt=""
                    className="block size-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2">
              {leftCol}
              {rightCol}
            </div>
          </div>
        )}

        {variant === "no-photo" && (
          <div className="mx-auto mt-14 grid max-w-3xl gap-x-14 gap-y-12 sm:grid-cols-2">
            {leftCol}
            {rightCol}
          </div>
        )}
      </div>
    </section>
  );
}

function OvalPhoto({
  photo,
  palette,
}: {
  photo?: string;
  palette: Palette;
}) {
  return (
    <div className="relative mx-auto w-[280px]">
      <div
        aria-hidden
        className="absolute inset-0 -m-2 rounded-[9999px]"
        style={{
          background: `linear-gradient(135deg, ${palette.accent}66, transparent)`,
          filter: "blur(20px)",
        }}
      />
      <div
        className="relative overflow-hidden border-2 shadow-2xl"
        style={{
          borderColor: palette.accent + "55",
          borderRadius: "50% / 38%",
          aspectRatio: "3 / 4",
        }}
      >
        {photo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={photo} alt="" className="block size-full object-cover" />
        )}
      </div>
    </div>
  );
}
