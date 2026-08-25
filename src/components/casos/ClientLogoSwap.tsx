import Image from "next/image";

/**
 * Logo cliente con swap default → hover.
 *
 * Convención: `src` apunta a la versión POSITIVA (color/marca), normalmente
 * `/img/casos/{slug}/logo/positivo.webp`. La versión NEGATIVA (B&N para
 * contraste) se deriva sustituyendo `positivo.` por `negativo.` en el path.
 *
 * - Default: muestra el negativo (en dark se ve blanco, en light se invierte
 *   a negro vía CSS filter en `.client-logo-bw`).
 * - Hover: muestra el positivo (color de marca). En light desactivamos el
 *   swap porque algunos positivos son blancos sobre fondo claro.
 *
 * El padre debe llevar la clase `group` para que `group-hover:` dispare.
 */
function toNegativePath(src: string): string {
  return src.replace("positivo.", "negativo.");
}

/**
 * Marcas de tinta oscura: su "positivo" es negro o un color casi negro sobre
 * transparente. Hacer el swap sobre fondo oscuro las haría desaparecer, así que
 * se quedan siempre en negativo: blanco en dark, invertido a negro en light por
 * `.client-logo-bw` (globals.css).
 *
 * Se listan por prefijo de ruta para que aplique en las cuatro superficies que
 * usan este componente (grid de casos, cabecera, relacionados y marquee).
 *
 * enfocalife: su morado de marca es #3b1147, que contra el fondo dark (#0e1015)
 * da 1.2:1 de contraste — ilegible.
 */
const MONOCHROME_LOGOS = ["/img/casos/hydrup/", "/img/casos/enfocalife/"];

function isMonochrome(src: string): boolean {
  return MONOCHROME_LOGOS.some((prefix) => src.startsWith(prefix));
}

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  imgClassName?: string;
  /** Si true, sólo renderiza la versión negativa (sin swap). Para contextos estáticos. */
  staticWhite?: boolean;
}

export function ClientLogoSwap({
  src,
  alt,
  width,
  height,
  imgClassName,
  staticWhite,
}: Props) {
  const negativeSrc = toNegativePath(src);

  if (staticWhite || isMonochrome(src)) {
    return (
      <span className="client-logo-bw inline-flex">
        <Image
          src={negativeSrc}
          alt={alt}
          width={width}
          height={height}
          className={imgClassName}
        />
      </span>
    );
  }

  return (
    <span className="client-logo-bw relative inline-flex">
      <Image
        src={negativeSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${imgClassName ?? ""} transition-opacity duration-300 group-hover:opacity-0`}
      />
      <Image
        src={src}
        alt=""
        aria-hidden
        width={width}
        height={height}
        className={`${imgClassName ?? ""} absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />
    </span>
  );
}
