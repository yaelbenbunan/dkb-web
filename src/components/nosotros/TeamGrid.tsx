"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { TEAM, TEAM_MEXICO, type TeamMember } from "@/lib/team";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Iniciales para fallback cuando un miembro no tiene avatar. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

interface TeamGroupProps {
  members: TeamMember[];
  /** Anchor id opcional para enlazar desde otro lado (ej. "equipo-mexico"). */
  id?: string;
  eyebrow: string;
  /** Título h2 con HTML (puede llevar spans para resaltar). */
  heading: React.ReactNode;
  /** Si true, se shufflean los miembros en cliente. Por defecto true. */
  shuffleClient?: boolean;
  /** CTA opcional al final (ej. enlace al equipo de México). */
  cta?: React.ReactNode;
  /** Decoraciones de fondo (spotlight + grid). Defaults a true. */
  withDecor?: boolean;
}

function TeamGroup({
  members: initialMembers,
  id,
  eyebrow,
  heading,
  shuffleClient = true,
  cta,
  withDecor = true,
}: TeamGroupProps) {
  const [members, setMembers] = useState(initialMembers);

  useEffect(() => {
    if (shuffleClient) setMembers(shuffle(initialMembers));
  }, [initialMembers, shuffleClient]);

  return (
    <section
      id={id}
      className="relative isolate overflow-hidden py-20 md:py-24 scroll-mt-24"
    >
      {withDecor && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
            style={{ ["--sx" as string]: "80%", ["--sy" as string]: "20%" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-25 fade-edges-y"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/40 to-transparent"
          />
        </>
      )}

      <Container>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#3a90f2]">
              <span className="inline-block h-px w-8 bg-[#3a90f2]" />
              {eyebrow}
            </p>
            <h2
              className="mt-6 max-w-3xl font-black leading-[1.05] tracking-tight"
              style={{ fontSize: "var(--text-display-md)" }}
            >
              {heading}
            </h2>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={shuffleClient ? { opacity: 0, y: 24 } : false}
              whileInView={shuffleClient ? { opacity: 1, y: 0 } : undefined}
              viewport={shuffleClient ? { once: true, margin: "-50px" } : undefined}
              transition={
                shuffleClient
                  ? { duration: 0.45, delay: Math.min(i, 12) * 0.04, ease: "easeOut" }
                  : undefined
              }
              className="flex flex-col items-center text-center"
            >
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-bg-elevated ring-1 ring-white/[0.05]">
                {m.avatar ? (
                  <Image
                    src={m.avatar}
                    alt={m.name}
                    width={300}
                    height={400}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <span className="text-3xl font-bold text-fg-muted">
                    {initials(m.name)}
                  </span>
                )}
              </div>
              <p className="mt-5 text-base font-bold text-fg">{m.name}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-[#3a90f2]/80">
                {m.role}
              </p>
            </motion.div>
          ))}
        </div>

        {cta && <div className="mt-16 text-center text-sm text-fg-muted">{cta}</div>}
      </Container>

      {withDecor && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/40 to-transparent"
        />
      )}
    </section>
  );
}

export function TeamGrid() {
  return (
    <TeamGroup
      members={TEAM}
      eyebrow="Conoce a nuestro equipo"
      heading={
        <>
          Lo que hacemos importa, pero{" "}
          <span className="italic text-accent">
            quién lo hace marca la diferencia
          </span>
          .
        </>
      }
      cta={
        <>
          ¿Buscas al equipo en México?{" "}
          <a
            href="/nosotros/mexico"
            className="font-semibold text-accent hover:text-accent-hover"
          >
            Conócelos →
          </a>
        </>
      }
    />
  );
}

export function TeamGridMexico() {
  return (
    <TeamGroup
      members={TEAM_MEXICO}
      eyebrow="Equipo en México"
      heading={
        <>
          Nuestros compañeros de{" "}
          <span className="italic text-accent">dinkbit México</span>
        </>
      }
      shuffleClient={false}
    />
  );
}
