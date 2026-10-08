/** Resume los correos que no salieron: una frase por motivo, con cuántos fueron
 *  y los detalles distintos. Pura y sin `server-only`, para poder probarla. */
export function resumirOmitidos(
  omitidos: Array<{ motivo: string; detalle?: string }>,
  textos: Record<string, string>,
): string {
  const grupos = new Map<string, { n: number; detalles: Set<string> }>();
  for (const o of omitidos) {
    const g = grupos.get(o.motivo) ?? { n: 0, detalles: new Set<string>() };
    g.n += 1;
    if (o.detalle) g.detalles.add(o.detalle);
    grupos.set(o.motivo, g);
  }
  return [...grupos]
    .map(([motivo, g]) => {
      const texto = (textos[motivo] ?? motivo).replace(/\.+$/, "");
      const detalle = g.detalles.size > 0 ? `: ${[...g.detalles].join("; ")}` : "";
      return `${g.n} — ${texto}${detalle}.`;
    })
    .join(" ");
}
