import { Container } from "@/components/ui/Container";
import { ContactForm } from "./ContactForm";
import { CONTACT_INFO } from "@/lib/contact-info";
import { getAllServices } from "@/lib/content";

interface Props {
  /** When true, omits the outer section wrapper (use when this lives inside another <article>) */
  bare?: boolean;
}

export function ContactSection({ bare = false }: Props) {
  const services = getAllServices().map((s) => ({
    slug: s.slug,
    title: s.title,
  }));

  const content = (
    <Container className="grid gap-14 lg:grid-cols-[2fr_3fr] lg:gap-20">
      {/* Info Panel */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
          Hablemos
        </p>
        <h2
          className="mt-6 font-black leading-[0.95] tracking-tight"
          style={{ fontSize: "var(--text-display-lg)" }}
        >
          <span className="text-[--color-accent]">Contáctanos.</span>
        </h2>
        <p className="mt-6 max-w-md text-lg text-[--color-fg-muted]">
          Cuéntanos tu proyecto. Te respondemos en{" "}
          <span className="text-[--color-fg]">menos de 24 horas</span>.
        </p>

        <ul className="mt-12 space-y-4">
          <ContactCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            label="Teléfono"
            value={CONTACT_INFO.phone}
            href={`tel:${CONTACT_INFO.phoneE164}`}
          />
          <ContactCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            label="Email"
            value={CONTACT_INFO.email}
            href={`mailto:${CONTACT_INFO.email}`}
          />
          <ContactCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="9"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            }
            label="Oficina"
            value={
              <>
                {CONTACT_INFO.address.line1}
                <br />
                {CONTACT_INFO.address.line2}
              </>
            }
            href={CONTACT_INFO.address.mapsUrl}
            external
          />
        </ul>
      </div>

      {/* Form */}
      <ContactForm services={services} />
    </Container>
  );

  if (bare) return content;

  return (
    <section className="relative isolate overflow-hidden bg-[--color-bg-deep] py-28 md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "20%", ["--sy" as string]: "40%" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
      />
      {content}
    </section>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  href: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="surface surface-hover group flex items-start gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#187bef]/15 text-[#187bef] ring-1 ring-[#187bef]/30 shadow-[0_8px_20px_-6px_rgba(24,123,239,0.4)]">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wider text-[--color-fg-muted]">
            {label}
          </span>
          <span className="mt-1 block text-base font-medium text-[--color-fg] group-hover:text-[--color-accent]">
            {value}
          </span>
        </span>
      </a>
    </li>
  );
}
