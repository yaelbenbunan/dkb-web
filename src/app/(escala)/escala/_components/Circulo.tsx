import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Rodea una cifra con un círculo hecho a mano, como quien la marca a lápiz.
 *
 * Es el mismo recurso que el subrayado y la misma razón: destacar sin meter un
 * segundo color. Y aquí hace algo más — **imita el gesto exacto que haría el
 * dueño de la clínica** si le pusieras las dos columnas en un papel delante.
 * Rodear el número que importa es lo que hace cualquiera con un boli.
 *
 * **Más ancho que la cifra, y con sitio de sobra.** Iba ceñido al número y el
 * trazo pasaba justo por encima de los dígitos: rodear algo es señalarlo, y si
 * la línea toca lo señalado deja de señalarlo y empieza a estorbarlo. Ahora se
 * sale medio cuerpo de letra por cada lado, que es lo que hace cualquiera al
 * rodear una cifra en un papel — el círculo no se ajusta al número, se dibuja
 * alrededor con el pulso que salga.
 *
 * **Nada en el trazo es regular, y ahí está todo el trabajo.** Un óvalo con los
 * cuatro cuartos iguales se lee como una forma por muy torcida que esté; para
 * que se lea como un gesto tiene que fallar como falla una mano:
 *
 * - La curva de la izquierda cae más plana y más baja que la de la derecha, que
 *   es lo que pasa cuando el trazo se hace de un tirón y sin apoyar.
 * - Arriba hay un tramo casi recto, en vez del arco perfecto que haría un
 *   compás.
 * - La vuelta no empalma: se pasa de largo y cruza por encima del arranque, y
 *   ese cruce es la señal más reconocible de que algo se ha hecho a mano.
 * - Y queda un segundo trazo corto en la curva de la izquierda, de esos que
 *   salen al repasar sin levantar el boli.
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
          // **En porcentaje y no en `em`.** Con `em` esto casi no crecía por
          // muchas décimas que se le pusieran, y la razón no se ve: el `em` se
          // resuelve contra el tamaño de letra de ESTE span, que hereda el de
          // la fila —16 px— y no el de la cifra que envuelve, que va en un span
          // interior a 56. Cada "0,9 em" eran 14 px en vez de los 50 que
          // parecían. En porcentaje se mide contra la caja del propio número,
          // así que el aire crece con la cifra sin depender de dónde se use.
          //
          // Los cuatro valores son distintos a propósito: un marco simétrico
          // alrededor del número vuelve a delatar que lo ha puesto una máquina.
          // Y son generosos porque el trazo tiene que pasar POR FUERA de los
          // dígitos: rodear algo es señalarlo, y una línea que cruza el "4" o
          // el "€" deja de señalar y empieza a estorbar la lectura.
          left: "-13%",
          right: "-16%",
          top: "-26%",
          bottom: "-30%",
          width: "auto",
          height: "auto",
          color,
          overflow: "visible",
        }}
      >
        {/* **Trece tramos cortos, no cuatro largos.** Con cuatro arcos, por
            muy distintos que se hagan entre sí, el resultado vuelve a leerse
            como una elipse: la curvatura cambia despacio y el ojo la reconoce.
            Un trazo a mano cambia de dirección cada poco, y eso solo se imita
            con tramos cortos que no se alinean del todo — cada punto de esta
            ruta está desviado unas unidades de donde caería en un óvalo.
            Además el aplastado del `preserveAspectRatio` se come parte de la
            variación vertical, así que hay que exagerarla para que sobreviva.

            Arranca en (180,32), da la vuelta entera y sigue hasta (140,8): la
            cola se pasa de largo y cruza por encima del tramo con el que
            empezó. Ese cruce es la señal más reconocible de que algo se ha
            hecho con un boli y no con un compás. */}
        <path
          d="M180 32 Q149 13 130 10 Q110 7 86 11 Q61 14 46 19 Q30 23 21 36 Q11 48 17 57 Q22 66 35 76 Q47 86 71 90 Q95 93 117 92 Q139 90 155 83 Q170 76 180 66 Q189 55 183 42 Q176 28 163 19 Q150 10 140 8"
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
          d="M40 21 Q23 32 16 47 Q12 58 26 70"
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
