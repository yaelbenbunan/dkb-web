import Image from "next/image";

/**
 * Hueco de imagen con su proporción real reservada.
 *
 * Mientras no exista el archivo, pinta un marcador que dice qué imagen va ahí y
 * a qué tamaño. El layout queda montado con las proporciones definitivas, así
 * que al sustituirlo por la imagen real no se mueve nada: no hay que rediseñar
 * después ni aparecen saltos de maquetación.
 *
 * Para activarla basta con dejar el archivo en `src` y poner `ready`.
 */
export function ImageSlot({
  src,
  alt,
  width,
  height,
  ready = false,
  label,
  className = "",
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** `true` cuando el archivo ya existe en /public. */
  ready?: boolean;
  /** Qué debe representar la imagen. Solo se ve en el marcador. */
  label?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (ready) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-300 bg-slate-100 text-center text-slate-400 ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-hidden="true"
    >
      <span className="text-2xl">🖼</span>
      <span className="px-4 text-xs font-semibold leading-tight">
        {label ?? alt}
      </span>
      <span className="font-mono text-[11px]">
        {width}×{height}
      </span>
    </div>
  );
}
