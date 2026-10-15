import type { FiltroOrigen } from "@/lib/ventas/filtros-origen";

/**
 * Desplegables de canal, campaña y etiqueta. Es un formulario GET: conserva el
 * resto de filtros de la página en campos ocultos. Si la marca no tiene ningún
 * valor de los tres (p. ej. Hydrup, cuyos leads no vienen de la web), no pinta nada.
 */
export function FiltrosOrigen({
  accion,
  valores,
  opciones,
  ocultos,
}: {
  accion: string;
  valores: FiltroOrigen;
  opciones: { canales: string[]; campanas: string[]; etiquetas: string[] };
  ocultos: Record<string, string | undefined>;
}) {
  if (!opciones.canales.length && !opciones.campanas.length && !opciones.etiquetas.length) return null;
  const select = { padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, background: "#fff" } as const;
  const campo = (name: "canal" | "campana" | "etiqueta", texto: string, lista: string[]) =>
    lista.length > 0 && (
      <select name={name} defaultValue={valores[name] ?? ""} aria-label={texto} style={select}>
        <option value="">{texto}: todos</option>
        {lista.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  return (
    <form action={accion} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {Object.entries(ocultos).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      {campo("canal", "Canal", opciones.canales)}
      {campo("campana", "Campaña", opciones.campanas)}
      {campo("etiqueta", "Etiqueta", opciones.etiquetas)}
      <button type="submit" style={{ ...select, cursor: "pointer", fontWeight: 600 }}>
        Filtrar
      </button>
    </form>
  );
}
