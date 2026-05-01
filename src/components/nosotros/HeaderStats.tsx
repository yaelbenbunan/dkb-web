import Image from "next/image";
import { AnimatedCounter } from "./AnimatedCounter";

const STATS = [
  { icon: "/img/icons/counters/experiencia.svg", value: 15, label: "años en el sector", prefix: "+" },
  { icon: "/img/icons/counters/webs.svg", value: 80, label: "webs desarrolladas", prefix: "+" },
  { icon: "/img/icons/counters/clientes.svg", value: 130, label: "clientes satisfechos", prefix: "+" },
  { icon: "/img/icons/counters/cafe.svg", value: 3000, label: "cafés", prefix: "+" },
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

          <div className="flex items-center gap-2">
            <Image
              src={s.icon}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 opacity-80"
            />
          </div>

          <p
            className="font-black leading-none transition-transform duration-500 group-hover:scale-105"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              background:
                "linear-gradient(135deg, #ffffff 0%, #3a90f2 70%, #187bef 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {s.prefix}
            <AnimatedCounter end={s.value} />
          </p>

          <p className="text-xs font-medium uppercase tracking-wider text-[--color-fg-muted]">
            {s.label}
          </p>
        </li>
      ))}
    </ul>
  );
}
