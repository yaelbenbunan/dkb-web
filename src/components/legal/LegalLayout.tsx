import { Container } from "@/components/ui/Container";

interface LegalLayoutProps {
  eyebrow: string;
  title: React.ReactNode;
  updatedAt?: string;
  children: React.ReactNode;
}

export function LegalLayout({
  eyebrow,
  title,
  updatedAt,
  children,
}: LegalLayoutProps) {
  return (
    <section className="relative isolate overflow-hidden py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "85%", ["--sy" as string]: "0%" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-25 fade-edges-y"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/40 to-transparent"
      />

      <Container className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#3a90f2]">
          <span className="inline-block h-px w-8 bg-[#3a90f2]" />
          {eyebrow}
        </p>
        <h1
          className="mt-6 font-black leading-[1.05] tracking-tight"
          style={{ fontSize: "var(--text-display-md)" }}
        >
          {title}
        </h1>
        {updatedAt && (
          <p className="mt-6 text-sm text-fg-dim">
            Última actualización:{" "}
            <time dateTime={updatedAt}>
              {new Date(updatedAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </p>
        )}

        <div className="prose prose-lg mt-12 max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-xl prose-a:text-[#187bef] prose-a:no-underline hover:prose-a:underline prose-strong:text-fg dark:prose-invert">
          {children}
        </div>
      </Container>
    </section>
  );
}
