import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Logotipo simulado, para ver el efecto del nombre en la página.
 *
 * **No es definitivo**: existe para poder mirarlo, no para imprimirlo. El nombre
 * sale de `GROWTH.name`, así que si cambia otra vez, cambia aquí solo.
 *
 * El símbolo son cuatro barras que suben, y esa es toda la idea: leídas de una
 * forma son una escalera —crecer—, leídas de otra son un gráfico de barras
 * —medir—. Se diseñó para «escala» y encaja igual de bien con «growth», que
 * quiere decir lo mismo.
 *
 * La última barra va en el color del acento y las otras tres apagadas: no es
 * decoración, es que la que importa es la de después, la que todavía no ha
 * pasado.
 *
 * Tuvo una versión compacta para ir dentro de la comparativa de las dos
 * clínicas; salió con ella el 25 de septiembre de 2026.
 */
export function Logotipo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {/* **Colores sólidos y no el acento a cuatro opacidades.** Con opacidad,
          el color que sale depende del fondo, así que sobre la foto del hero las
          tres barras apagadas se teñían de lo que hubiera debajo. Un logotipo
          no puede cambiar de color según dónde se ponga.

          Son el acento (#30CCCE) oscurecido al 37 %, 50 % y 68 %: las mismas
          proporciones que tenían los verdes del logotipo de escala respecto a
          su lima. */}
      <svg aria-hidden viewBox="0 0 40 34" className="h-8 w-auto shrink-0">
        {[
          { x: 0, y: 24, h: 10, c: "#124B4C" },
          { x: 10, y: 17, h: 17, c: "#186667" },
          { x: 20, y: 9, h: 25, c: "#218B8C" },
          { x: 30, y: 0, h: 34, c: T.accent },
        ].map((b) => (
          <rect key={b.x} x={b.x} y={b.y} width="7" height={b.h} rx="2.4" fill={b.c} />
        ))}
      </svg>

      <span className="leading-none">
        <span
          className="block font-black tracking-[-0.045em]"
          style={{ fontSize: "1.6rem", color: T.fg }}
        >
          {GROWTH.name.toLowerCase()}
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
