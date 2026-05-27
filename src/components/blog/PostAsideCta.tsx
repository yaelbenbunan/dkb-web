import Link from "next/link";

export function PostAsideCta() {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
        ¿Te ayudamos?
      </p>
      <p className="mt-3 text-base font-bold leading-tight text-fg">
        Si lo que has leído te ha sonado a tu negocio, escríbenos.
      </p>
      <Link
        href="/contacto"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-xs font-bold text-white shadow-[0_8px_22px_-8px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
      >
        Hablar con el equipo →
      </Link>
    </div>
  );
}
