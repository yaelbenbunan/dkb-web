import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Logotipo simulado, para ver el efecto del nombre en la página.
 *
 * **No es definitivo**: el nombre comercial sigue sin cerrarse (§14 del
 * documento de producto) y esto existe para poder mirarlo, no para imprimirlo.
 *
 * El símbolo son cuatro barras que suben, y esa es toda la idea: leídas de una
 * forma son una escalera —crecer—, leídas de otra son un gráfico de barras
 * —medir—. Las dos cosas a la vez es literalmente lo que significa la palabra
 * "escala", y por eso se eligió frente a "Eskla": esa pierde el significado y
 * encima hay que deletrearla por teléfono.
 *
 * La última barra va en lima y las otras tres apagadas: no es decoración, es
 * que la que importa es la de después, la que todavía no ha pasado.
 */
export function Logotipo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        aria-hidden
        viewBox="0 0 40 34"
        className="h-8 w-auto shrink-0"
        style={{ color: T.lime }}
      >
        {[
          { x: 0, y: 24, h: 10, o: 0.3 },
          { x: 10, y: 17, h: 17, o: 0.45 },
          { x: 20, y: 9, h: 25, o: 0.65 },
          { x: 30, y: 0, h: 34, o: 1 },
        ].map((b) => (
          <rect
            key={b.x}
            x={b.x}
            y={b.y}
            width="7"
            height={b.h}
            rx="2.4"
            fill="currentColor"
            opacity={b.o}
          />
        ))}
      </svg>

      <span className="leading-none">
        <span
          className="block font-black tracking-[-0.045em]"
          style={{ fontSize: "1.6rem", color: T.fg }}
        >
          escala
        </span>
        <span
          className="mt-1 block text-[0.7rem] font-bold uppercase tracking-[0.22em]"
          style={{ color: T.muted }}
        >
          by dinkbit
        </span>
      </span>
    </span>
  );
}
