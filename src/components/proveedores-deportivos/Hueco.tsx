/**
 * Un dato que todavía no tenemos (cifra, testimonio, respuesta). Se pinta a la
 * vista y con borde discontinuo a propósito: que nadie lo publique sin
 * rellenar por despiste, y que nadie lo confunda con un dato real.
 */
export function Hueco({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-placeholder
      className="rounded px-1"
      style={{ background: "rgba(77,163,255,.12)", border: "1px dashed #4DA3FF", color: "#4DA3FF" }}
    >
      {children}
    </span>
  );
}
