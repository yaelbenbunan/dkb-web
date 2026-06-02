import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ClientLogoSwap } from "./ClientLogoSwap";
import type { CaseStudy } from "@/lib/types";

interface Props {
  caseStudy: CaseStudy;
  serviceTitleBySlug: Record<string, string>;
}

export function CaseHeader({ caseStudy, serviceTitleBySlug }: Props) {
  const hasSocial = caseStudy.social && hasAnySocial(caseStudy.social);

  return (
    <header className="relative isolate overflow-hidden">
      {/* Bg azul tintado para destacar — claro u oscuro según el tema */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{ background: "var(--case-header-bg)" }}
      />
      {/* Spotlight azul fuerte */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 65% at 20% 30%, rgba(58,144,242,0.4), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30 fade-edges-y"
      />

      <Container className="relative grid gap-12 py-14 md:grid-cols-[1fr_auto] md:items-center md:gap-16 md:py-24">
        {/* Izq: title → description → date → tags */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Caso de éxito
          </p>

          {/* Móvil: el logo sustituye al título (más compacto y de marca) */}
          {caseStudy.clientLogo && (
            <div className="mt-5 md:hidden">
              <ClientLogoSwap
                src={caseStudy.clientLogo}
                alt={caseStudy.client}
                width={240}
                height={120}
                imgClassName="max-h-20 w-auto object-contain"
                staticWhite
              />
            </div>
          )}

          {/* Escritorio: título grande */}
          <h1
            className="mt-6 hidden font-black leading-[0.95] tracking-tight md:block"
            style={{
              fontSize: "var(--text-display-lg)",
              color: "var(--case-header-fg)",
            }}
          >
            {caseStudy.title}
          </h1>

          {caseStudy.description && (
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed"
              style={{ color: "var(--case-header-fg-muted)" }}
            >
              {caseStudy.description}
            </p>
          )}

          {caseStudy.clientSince && (
            <p
              className="mt-7 text-sm"
              style={{ color: "var(--case-header-fg-muted)" }}
            >
              Cliente desde{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--case-header-fg)" }}
              >
                {caseStudy.clientSince}
              </span>
            </p>
          )}

          {caseStudy.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {caseStudy.tags.map((t) => (
                <li key={t}>
                  <Link
                    href={`/servicios/${t}`}
                    className="inline-flex h-8 items-center rounded-full bg-accent/15 px-4 text-xs font-semibold uppercase tracking-wider text-accent-hover ring-1 ring-accent/30 transition-all hover:bg-accent hover:text-white"
                  >
                    {serviceTitleBySlug[t] ?? t}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Móvil: redes pegadas justo debajo de las etiquetas */}
          {hasSocial && caseStudy.social && (
            <div className="mt-5 md:hidden">
              <SocialIcons social={caseStudy.social} className="justify-start" />
            </div>
          )}
        </div>

        {/* Escritorio: logo + iconos sociales centrados respecto al logo.
            En móvil este bloque se oculta (logo y redes ya van a la izquierda). */}
        {(caseStudy.clientLogo || hasSocial) && (
          <div className="hidden w-fit flex-col items-center gap-5 md:flex">
            {caseStudy.clientLogo && (
              <ClientLogoSwap
                src={caseStudy.clientLogo}
                alt={caseStudy.client}
                width={280}
                height={140}
                imgClassName="max-h-32 w-auto object-contain md:max-h-40"
                staticWhite
              />
            )}
            {hasSocial && caseStudy.social && (
              <SocialIcons social={caseStudy.social} className="justify-center" />
            )}
          </div>
        )}
      </Container>

      {/* Línea brillante inferior */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
      />
    </header>
  );
}

function hasAnySocial(s: NonNullable<CaseStudy["social"]>): boolean {
  return Boolean(s.website || s.facebook || s.instagram || s.linkedin || s.twitter);
}

/** Fila de iconos de redes del cliente. `className` controla la alineación
 *  (centrada en escritorio, a la izquierda bajo las etiquetas en móvil). */
function SocialIcons({
  social,
  className = "",
}: {
  social: NonNullable<CaseStudy["social"]>;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {social.website && (
        <SocialLink
          href={social.website}
          label="Sitio web"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          }
        />
      )}
      {social.facebook && (
        <SocialLink
          href={social.facebook}
          label="Facebook"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z" />
            </svg>
          }
        />
      )}
      {social.instagram && (
        <SocialLink
          href={social.instagram}
          label="Instagram"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
          }
        />
      )}
      {social.linkedin && (
        <SocialLink
          href={social.linkedin}
          label="LinkedIn"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.4 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7v7.44H17.3v-6.6c0-1.57-.03-3.6-2.19-3.6-2.2 0-2.54 1.72-2.54 3.49V22H7.62V8z" />
            </svg>
          }
        />
      )}
      {social.youtube && (
        <SocialLink
          href={social.youtube}
          label="YouTube"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
            </svg>
          }
        />
      )}
      {social.tiktok && (
        <SocialLink
          href={social.tiktok}
          label="TikTok"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.6 6.5a5.7 5.7 0 01-3.4-1.1A5.7 5.7 0 0114 1h-3.5v13.6a2.6 2.6 0 11-2.6-2.6c.3 0 .5 0 .8.1V8.5a6.2 6.2 0 00-.8-.1 6.1 6.1 0 106.1 6.1V8a9 9 0 005.6 1.9V6.4a5.7 5.7 0 01-.0.1z" />
            </svg>
          }
        />
      )}
    </div>
  );
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:scale-110 hover:bg-accent hover:text-white hover:ring-accent hover:shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)]"
      style={{
        backgroundColor: "var(--social-pill-bg)",
        boxShadow: "inset 0 0 0 1px var(--social-pill-ring)",
        color: "var(--case-header-fg-muted)",
      }}
    >
      {icon}
    </a>
  );
}
