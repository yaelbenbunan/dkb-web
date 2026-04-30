import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/lib/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/servicios/${service.slug}`}
      className="group block rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-6 transition-colors hover:border-[--color-accent]"
    >
      <Image
        src={`/img/icons/servicios/${service.slug}.png`}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10"
      />
      <p className="mt-4 text-lg font-semibold text-[--color-fg]">{service.title}</p>
      <p className="mt-2 text-sm text-[--color-fg-muted]">
        {service.shortDescription}
      </p>
      <p className="mt-4 text-sm font-medium text-[--color-accent]">Conocer más →</p>
    </Link>
  );
}
