import Image from "next/image";
import { AnimatedCounter } from "./AnimatedCounter";

const STATS = [
  { icon: "/img/icons/counters/experiencia.svg", value: 15, label: "años en el sector", prefix: "+" },
  { icon: "/img/icons/counters/webs.svg", value: 400, label: "webs desarrolladas", prefix: "+" },
  { icon: "/img/icons/counters/clientes.svg", value: 600, label: "clientes satisfechos", prefix: "+" },
  { icon: "/img/icons/counters/cafe.svg", value: 5000, label: "cafés", prefix: "+" },
];

/**
 * Tira de stats inline para el header de Nosotros. Compacta, sin caja:
 * 4 columnas con icono pequeño + número en gradiente + label corto.
 * Pensada para reforzar el título principal con credenciales tangibles.
 */
export function HeaderStats() {
  return (
    <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
      {STATS.map((s, i) => (
        <li
          key={s.label}
          className="group relative flex flex-col gap-1.5 sm:px-2"
        >
          {/* Separador vertical sutil entre items en desktop */}
          {i > 0 && (
            <span
              aria-hidden
              className="absolute left-0 top-1/2 hidden h-12 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[#187bef]/30 to-transparent sm:block"
            />
          )}

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#187bef]/15 ring-1 ring-[#187bef]/35">
            <Image
              src={s.icon}
              alt=""
              width={32}
              height={32}
              className="h-7 w-7"
            />
          </div>

          <p
            className="font-black leading-none transition-transform duration-500 group-hover:scale-105"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              background: "var(--stat-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {s.prefix}
            <AnimatedCounter end={s.value} />
          </p>

          <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
            {s.label}
          </p>
        </li>
      ))}
    </ul>
  );
}
