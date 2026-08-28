import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Rodea una cifra con un círculo hecho a mano, como quien la marca a lápiz.
 *
 * Es el mismo recurso que el subrayado y la misma razón: destacar sin meter un
 * segundo color. Y aquí hace algo más — **imita el gesto exacto que haría el
 * dueño de la clínica** si le pusieras las dos columnas en un papel delante.
 * Rodear el número que importa es lo que hace cualquiera con un boli.
 *
 * **Nada en el trazo está centrado ni cerrado.** El óvalo va torcido respecto a
 * la cifra, la vuelta no empalma con el arranque —se pasa de largo y cruza por
 * encima, como cuando el boli sigue un poco más de la cuenta— y hay un segundo
 * trazo corto en la curva de la izquierda, de los que salen cuando se repasa
 * sin levantar la mano. Un óvalo perfecto se lee como una forma; éste tiene que
 * leerse como un gesto, y para eso los defectos son el mensaje.
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
          left: "-0.38em",
          right: "-0.42em",
          top: "-0.3em",
          bottom: "-0.32em",
          width: "auto",
          height: "auto",
          color,
          overflow: "visible",
        }}
      >
        {/* La vuelta entera. Arranca en (164,20) y termina en (150,17): no
            empalma, se pasa y cruza por encima del arranque. Los tramos tienen
            curvaturas distintas a propósito —la izquierda cae más plana que la
            derecha— porque una elipse con los cuatro cuartos iguales vuelve a
            parecer dibujada por una máquina. */}
        <path
          d="M164 20C143 11 110 6 79 9 49 12 22 25 14 43 7 60 21 75 47 84c28 10 71 10 100 2 27-8 44-23 41-39-2-13-16-23-38-30"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.92}
          vectorEffect="non-scaling-stroke"
        />
        {/* El repaso: un trozo corto de la curva izquierda, ni encima ni al
            lado del anterior. Es lo que deja el boli cuando vuelve sobre lo ya
            hecho, y es lo que impide que el trazo parezca vectorial. */}
        <path
          d="M35 26C21 36 15 48 19 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.45}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
