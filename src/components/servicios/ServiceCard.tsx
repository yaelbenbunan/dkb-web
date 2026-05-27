import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/lib/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/servicios/${service.slug}`}
      className="surface surface-hover group relative flex h-full flex-col rounded-2xl px-6 pb-6 pt-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(24,123,239,0.4)]"
    >
      <div className="flex items-start justify-between">
        <Image
          src={`/img/icons/servicios/${service.slug}.png`}
          alt={`Icono ${service.title}`}
          width={44}
          height={44}
          className="h-11 w-11"
        />
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-fg-muted transition-all group-hover:rotate-[-8deg] group-hover:bg-accent group-hover:text-white">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M4 10L10 4M10 4H5M10 4V9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <p className="mt-6 text-xl font-bold leading-tight text-fg">
        {service.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {service.shortDescription}
      </p>
    </Link>
  );
}
