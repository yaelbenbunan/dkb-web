import Image from "next/image";

/**
 * Renders the client logo swapping between white (default) and color (hover).
 *
 * Convention: `src` points to the COLOR version inside `/img/casos/logos/logos-color/`.
 * The white version is auto-derived by replacing the segment with `/logos-blancos/`.
 *
 * Both files must exist with the same filename in their respective folders.
 *
 * Usage requires the parent to have the `group` class so `group-hover:` triggers.
 */
function toWhitePath(src: string): string {
  return src.replace("/logos-color/", "/logos-blancos/");
}

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  imgClassName?: string;
  /** When true, only render the white version (no hover swap). For static contexts. */
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
  const whiteSrc = toWhitePath(src);

  if (staticWhite) {
    return (
      <Image
        src={whiteSrc}
        alt={alt}
        width={width}
        height={height}
        className={imgClassName}
      />
    );
  }

  return (
    <span className="relative inline-flex">
      <Image
        src={whiteSrc}
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
