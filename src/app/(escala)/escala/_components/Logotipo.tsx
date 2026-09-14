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
export function Logotipo({
  className = "",
  compacto = false,
}: {
  className?: string;
  /**
   * Para cuando va dentro de una línea de texto y no como firma.
   *
   * Baja el símbolo, iguala el nombre al tamaño de lo que le rodea y **quita el
   * «by dinkbit»**: en un rótulo de tarjeta esa segunda línea parte el renglón
   * en dos y el logotipo deja de leerse como una palabra dentro de la frase.
   */
  compacto?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center ${compacto ? "gap-1.5 align-middle" : "gap-3"} ${className}`}
    >
      {/* **Los cuatro verdes son los del logotipo, sacados del fichero.**
          Antes eran el mismo lima a cuatro opacidades, y eso tiene un problema
          que no se ve hasta que hay algo detrás: con opacidad, el color que
          sale depende del fondo, así que sobre la foto del hero las tres barras
          apagadas se teñían de lo que hubiera debajo. Un logotipo no puede
          cambiar de color según dónde se ponga.

          Medidos a pixel sobre «logo escala - sin fondo.png». El cuarto es
          #C7F73D, o sea el mismo lima del tema: la paleta de la landing ya salía
          de aquí. */}
      <svg
        aria-hidden
        viewBox="0 0 40 34"
        className={`${compacto ? "h-[1.05em]" : "h-8"} w-auto shrink-0`}
      >
        {[
          { x: 0, y: 24, h: 10, c: "#4A5A21" },
          { x: 10, y: 17, h: 17, c: "#647C28" },
          { x: 20, y: 9, h: 25, c: "#88A830" },
          { x: 30, y: 0, h: 34, c: T.lime },
        ].map((b) => (
          <rect key={b.x} x={b.x} y={b.y} width="7" height={b.h} rx="2.4" fill={b.c} />
        ))}
      </svg>

      <span className="leading-none">
        <span
          className="block font-black tracking-[-0.045em]"
          style={compacto ? { color: T.fg } : { fontSize: "1.6rem", color: T.fg }}
        >
          escala
        </span>
        {!compacto && (
          <span
            className="mt-1 block text-[0.7rem] font-bold uppercase tracking-[0.22em]"
            style={{ color: T.muted }}
          >
            by dinkbit
          </span>
        )}
      </span>
    </span>
  );
}
