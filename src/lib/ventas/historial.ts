/** Texto legible de cada entrada del historial de un lead. Puro. */

import { FASE_LABELS, ORIGEN_LABELS, RESULTADO_LABELS, esFase, type Origen, type ResultadoLlamada } from "./dominio";
import { formatoFecha } from "./metricas";

export function describirActividad(
  a: {
    tipo: string;
    resultado: string | null;
    nota: string | null;
    datos: Record<string, unknown>;
    usuaria_id: string | null;
  },
  nombres: Record<string, string>,
): { titulo: string; detalle: string | null; autora: string } {
  const autora = a.usuaria_id === null ? "Sistema" : (nombres[a.usuaria_id] ?? "Usuaria eliminada");
  const datos = a.datos ?? {};

  let titulo: string;
  switch (a.tipo) {
    case "llamada":
      titulo = `Llamada · ${RESULTADO_LABELS[a.resultado as ResultadoLlamada] ?? "sin resultado"}`;
      break;
    case "nota":
      titulo = "Nota";
      break;
    case "muestras_enviadas":
      titulo = "Muestras enviadas";
      break;
    case "pedido_vinculado":
      titulo = "Pedido vinculado";
      break;
    case "cambio_fase": {
      const antes = esFase(datos.fase_anterior) ? FASE_LABELS[datos.fase_anterior] : "—";
      const despues = esFase(datos.fase_nueva) ? FASE_LABELS[datos.fase_nueva] : "—";
      titulo = `Fase: ${antes} → ${despues}`;
      break;
    }
    case "lead_creado": {
      const origen = ORIGEN_LABELS[datos.origen as Origen] ?? "Origen desconocido";
      const detalleOrigen = typeof datos.origen_detalle === "string" && datos.origen_detalle ? ` (${datos.origen_detalle})` : "";
      titulo = `Lead creado · ${origen}${detalleOrigen}`;
      break;
    }
    default:
      titulo = a.tipo;
  }

  const partes: string[] = [];
  if (a.nota) partes.push(a.nota);
  if ("proximo_seguimiento" in datos) {
    const proximo = datos.proximo_seguimiento;
    partes.push(typeof proximo === "string" && proximo ? `Próximo seguimiento: ${formatoFecha(proximo)}` : "Sin seguimiento pendiente");
  }

  return { titulo, detalle: partes.length > 0 ? partes.join(" · ") : null, autora };
}
