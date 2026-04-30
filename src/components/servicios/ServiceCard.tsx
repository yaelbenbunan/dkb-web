import Link from "next/link";
import type { Service } from "@/lib/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/servicios/${service.slug}`}
      className="group block rounded-2xl border border-slate-200 p-6 transition-colors hover:border-[--color-accent]"
    >
      <p className="text-lg font-semibold">{service.title}</p>
      <p className="mt-2 text-sm text-slate-600">{service.shortDescription}</p>
      <p className="mt-4 text-sm font-medium text-[--color-accent]">Conocer más →</p>
    </Link>
  );
}
