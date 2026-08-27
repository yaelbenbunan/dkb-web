import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Rodea una cifra con un círculo hecho a mano, como quien la marca a lápiz.
 *
 * Es el mismo recurso que el subrayado y la misma razón: destacar sin meter un
 * segundo color. Y aquí hace algo más — **imita el gesto exacto que haría el
 * dueño de la clínica** si le pusieras las dos columnas en un papel delante.
 * Rodear el número que importa es lo que hace cualquiera con un boli.
 *
 * Va con un trazo que no cierra del todo y que se pasa de largo al final. Un
 * óvalo perfecto se lee como una forma; éste se lee como un gesto.
 *
 * Solo se usa en UNA de las dos tarjetas, a propósito: si se rodearan las dos,
 * no estaría señalando nada.
 */
export function Circulo({
  children,
  color = T.lime,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute"
        style={{
          // Se sale por los cuatro lados: un círculo que toca justo el borde
          // del texto parece un recuadro, no un garabato.
          left: "-0.35em",
          right: "-0.35em",
          top: "-0.28em",
          bottom: "-0.28em",
          width: "auto",
          height: "auto",
          color,
          overflow: "visible",
        }}
      >
        <path
          d="M172 26C152 9 96 2 52 11 20 18 5 38 11 58c7 24 60 38 111 33 40-4 66-18 71-35 3-12-6-24-24-32"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity={0.9}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
