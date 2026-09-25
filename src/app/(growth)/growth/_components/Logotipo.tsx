import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Logotipo provisional de Growth.
 *
 * **Otro símbolo y otra composición que los de Escala, a propósito** (25 de
 * septiembre de 2026). Escala eran cuatro barras en escalera con el nombre en
 * minúscula y «by dinkbit» debajo; si Growth lo heredara con otro color, los
 * dos negocios se leerían como uno. Aquí es una baldosa turquesa con una flecha
 * que sube y el nombre con mayúscula, y la firma va en la misma línea.
 *
 * No es definitivo: existe para poder ver la página con marca, no para
 * imprimirlo. El nombre sale de `GROWTH.name`.
 */
export function Logotipo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg aria-hidden viewBox="0 0 32 32" className="h-8 w-8 shrink-0">
        <rect width="32" height="32" rx="9" fill={T.accent} />
        <path
          d="M9 21.5 14.5 16l3.5 3.5L23.5 12M18.5 12h5v5"
          fill="none"
          stroke={T.onAccent}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[1.35rem] font-extrabold tracking-[-0.02em]" style={{ color: T.fg }}>
        {GROWTH.name}
      </span>
      <span className="mt-1 text-xs font-medium" style={{ color: T.muted }}>
        by dinkbit
      </span>
    </span>
  );
}
