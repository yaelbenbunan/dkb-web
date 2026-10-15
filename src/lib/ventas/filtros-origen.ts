/**
 * Filtros por canal, campaña y etiqueta de la lista y el tablero de leads.
 * Se aplican en memoria sobre los leads de la marca ya leídos: así los
 * desplegables solo ofrecen valores que existen. Puro.
 */

export interface ConOrigen {
  canal?: string | null;
  campana?: string | null;
  etiquetas?: string[];
}

export interface FiltroOrigen {
  canal?: string;
  campana?: string;
  etiqueta?: string;
}

const unicos = (v: (string | null | undefined)[]) => [...new Set(v.filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, "es"));

export function opcionesOrigen(leads: ConOrigen[]): { canales: string[]; campanas: string[]; etiquetas: string[] } {
  return {
    canales: unicos(leads.map((l) => l.canal)),
    campanas: unicos(leads.map((l) => l.campana)),
    etiquetas: unicos(leads.flatMap((l) => l.etiquetas ?? [])),
  };
}

export function filtrarPorOrigen<T extends ConOrigen>(leads: T[], f: FiltroOrigen): T[] {
  return leads.filter(
    (l) =>
      (!f.canal || l.canal === f.canal) &&
      (!f.campana || l.campana === f.campana) &&
      (!f.etiqueta || (l.etiquetas ?? []).includes(f.etiqueta)),
  );
}

export function leerFiltroOrigen(sp: { canal?: string; campana?: string; etiqueta?: string }): FiltroOrigen {
  const f: FiltroOrigen = {};
  if (sp.canal) f.canal = sp.canal;
  if (sp.campana) f.campana = sp.campana;
  if (sp.etiqueta) f.etiqueta = sp.etiqueta;
  return f;
}
