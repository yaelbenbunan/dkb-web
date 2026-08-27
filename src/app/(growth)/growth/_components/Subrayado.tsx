import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Subraya unas palabras con un trazo hecho a mano.
 *
 * **Es el único recurso de énfasis de la landing, y sustituye a un segundo
 * color.** Antes había dos acentos: lima para lo que se gana y otro tono para
 * el problema. Con dos colores, el lector tiene que aprender qué significa cada
 * uno mientras lee; con uno solo, el lima significa siempre lo mismo —esto
 * importa— y no hay nada que descifrar.
 *
 * El trazo va torcido a propósito. Una línea recta bajo una palabra es una
 * decoración de plantilla y se ve como tal; esta parece hecha con un rotulador
 * encima de algo que alguien quería remarcar, que es exactamente el gesto que
 * imita.
 *
 * Va detrás del texto y no debajo: `bottom` negativo lo saca del renglón para
 * que no empuje la línea siguiente, y `preserveAspectRatio="none"` deja que el
 * trazo se estire a lo ancho de las palabras que toque, sean dos o siete.
 */
export function Subrayado({
  children,
  color = T.lime,
  grosor = 1,
}: {
  children: React.ReactNode;
  color?: string;
  /** Multiplica el grosor del trazo, para titulares muy grandes. */
  grosor?: number;
}) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden
        viewBox="0 0 200 16"
        preserveAspectRatio="none"
        className="absolute left-0 w-full"
        style={{ bottom: "-0.22em", height: "0.42em", color, overflow: "visible" }}
      >
        {/* Dos trazos que no se solapan del todo: uno solo se ve limpio y
            vuelve a parecer una línea; dos, con distinta curva y opacidad,
            parecen tinta. */}
        <path
          d="M4 11.2C46 6.4 112 4.9 196 8.1"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.4 * grosor}
          strokeLinecap="round"
          opacity={0.95}
        />
        <path
          d="M9 13.6C58 10.2 128 9.4 191 11.9"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8 * grosor}
          strokeLinecap="round"
          opacity={0.45}
        />
      </svg>
    </span>
  );
}
