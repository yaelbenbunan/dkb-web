import "server-only";
import { secretMatches } from "../webhook-auth";
import { leadDesdeAnuncio } from "./anuncios";
import {
  buscarLeadPorContacto,
  crearLeads,
  getLead,
  getMarcaPorSlug,
  listContactosLeads,
  listExclusiones,
  registrarActividad,
  registrarImportacion,
  type Escritura,
  type Marca,
  type Usuaria,
} from "./db";
import { faseTrasLlamada, seguimientoTrasLlamada } from "./dominio";
import { clasificarLeads, parseVentasLeadsCsv, type LeadNuevo } from "./leads-csv";
import type { CambioFase, Llamada, NotaSeguimiento } from "./validacion";

export type ResultadoImportacion =
  | { ok: true; creados: number; duplicados: number; excluidos: number }
  | { ok: false; error: string; errores: { line: number; message: string }[] };

/**
 * Importa una lista de prospección. Todo o nada: con una sola fila errónea no
 * se guarda ninguna (se corrige el fichero y se vuelve a subir). Duplicados y
 * excluidos no se importan: un excluido ya es cliente de la marca.
 */
export async function importarLeadsCsv(input: {
  marca: Marca;
  usuaria: Usuaria;
  csv: string;
  nombreFichero: string;
  nombreLista: string;
}): Promise<ResultadoImportacion> {
  const nombreLista = input.nombreLista.trim();
  if (!nombreLista) {
    return { ok: false, error: "Ponle nombre a la lista (por ejemplo «Gimnasios Madrid septiembre»).", errores: [] };
  }

  const parsed = parseVentasLeadsCsv(input.csv);
  if (parsed.errores.length > 0) {
    return { ok: false, error: "El fichero tiene filas con errores. Corrígelas y vuelve a subirlo: no se ha guardado nada.", errores: parsed.errores };
  }
  if (parsed.filas.length === 0) {
    return { ok: false, error: "No hay ninguna fila que importar.", errores: [] };
  }

  const [existentes, exclusiones] = await Promise.all([listContactosLeads(input.marca.id), listExclusiones(input.marca.id)]);
  const clasificacion = clasificarLeads(parsed.filas, existentes, exclusiones);

  let creados = 0;
  if (clasificacion.nuevos.length > 0) {
    const res = await crearLeads({
      marcaId: input.marca.id,
      usuariaId: input.usuaria.id,
      origen: "lista",
      origenDetalle: nombreLista,
      leads: clasificacion.nuevos.map((l) => ({ ...l, excluido: false })),
    });
    if (!res.ok) {
      return { ok: false, error: "No se pudo guardar la importación. No se ha guardado ninguna fila.", errores: [] };
    }
    creados = res.creados;
  }

  // Lo que la base saltó por un duplicado que apareció entre la lectura y el insert.
  const duplicados = clasificacion.duplicados.length + (clasificacion.nuevos.length - creados);
  await registrarImportacion({
    marca_id: input.marca.id,
    tipo: "leads",
    nombre_fichero: input.nombreFichero,
    filas_totales: parsed.filas.length,
    filas_guardadas: creados,
    resumen: { lista: nombreLista, duplicados, excluidos: clasificacion.excluidos.length },
    usuaria_id: input.usuaria.id,
  });

  return { ok: true, creados, duplicados, excluidos: clasificacion.excluidos.length };
}

/**
 * Webhook de anuncios. Marca desconocida y secreto incorrecto responden igual
 * (401), para no revelar qué marcas existen. Un lead repetido no se duplica:
 * se apunta en su historial que ha vuelto a llegar. Un cliente previo se
 * guarda marcado como excluido, para que se vea que ha pedido información.
 */
export async function recibirLeadAnuncio(input: {
  slug: string;
  secreto: string | null;
  datos: unknown;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const marca = await getMarcaPorSlug(input.slug);
  if (!marca || !secretMatches(input.secreto, marca.webhook_secret)) {
    return { status: 401, body: { ok: false, error: "unauthorized" } };
  }
  if (typeof input.datos !== "object" || input.datos === null || Array.isArray(input.datos)) {
    return { status: 400, body: { ok: false, error: "invalid_body" } };
  }

  const leido = leadDesdeAnuncio(input.datos as Record<string, unknown>);
  if (!leido.ok) return { status: 400, body: { ok: false, error: leido.error } };

  const [existentes, exclusiones] = await Promise.all([listContactosLeads(marca.id), listExclusiones(marca.id)]);
  const clasificacion = clasificarLeads([leido.lead], existentes, exclusiones);

  if (clasificacion.duplicados.length > 0) {
    const existente = await buscarLeadPorContacto(marca.id, leido.lead);
    if (existente) {
      await registrarActividad({
        leadId: existente.id,
        usuariaId: null,
        tipo: "nota",
        nota: `Ha vuelto a llegar desde anuncios${leido.campana ? ` (${leido.campana})` : ""}.`,
      });
    }
    return { status: 200, body: { ok: true, duplicado: true } };
  }

  const res = await crearLeads({
    marcaId: marca.id,
    usuariaId: null,
    origen: "anuncio",
    origenDetalle: leido.campana || null,
    leads: [{ ...leido.lead, excluido: clasificacion.excluidos.length > 0 }],
  });
  if (!res.ok) return { status: 500, body: { ok: false, error: "not_saved" } };
  return { status: 200, body: { ok: true, duplicado: res.creados === 0 } };
}

export async function crearLeadManual(input: {
  marca: Marca;
  usuaria: Usuaria;
  datos: LeadNuevo;
}): Promise<{ ok: true; leadId: string } | { ok: false; error: string }> {
  const [existentes, exclusiones] = await Promise.all([listContactosLeads(input.marca.id), listExclusiones(input.marca.id)]);
  const clasificacion = clasificarLeads([input.datos], existentes, exclusiones);
  if (clasificacion.excluidos.length > 0) {
    return { ok: false, error: "Este negocio está en la lista de exclusión: ya era cliente de la marca." };
  }
  if (clasificacion.duplicados.length > 0) {
    return { ok: false, error: "Ya existe un lead de esta marca con ese email o teléfono." };
  }
  const res = await crearLeads({
    marcaId: input.marca.id,
    usuariaId: input.usuaria.id,
    origen: "manual",
    origenDetalle: null,
    leads: [{ ...input.datos, excluido: false }],
  });
  if (!res.ok || res.creados === 0) return { ok: false, error: "No se pudo crear el lead." };
  const lead = await buscarLeadPorContacto(input.marca.id, input.datos);
  return lead ? { ok: true, leadId: lead.id } : { ok: false, error: "Lead creado, pero no se ha podido abrir. Búscalo en la lista." };
}

export async function registrarLlamada(input: { usuaria: Usuaria; leadId: string; llamada: Llamada }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  const fase = faseTrasLlamada(lead.fase, input.llamada.resultado);
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "llamada",
    resultado: input.llamada.resultado,
    nota: input.llamada.nota,
    faseNueva: fase === lead.fase ? null : fase,
    proximoSeguimiento: seguimientoTrasLlamada(input.llamada.resultado, input.llamada.proximo_seguimiento),
  });
}

export async function marcarMuestrasEnviadas(input: { usuaria: Usuaria; leadId: string; datos: NotaSeguimiento }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "muestras_enviadas",
    nota: input.datos.nota,
    faseNueva: lead.fase === "cliente" || lead.fase === "muestras" ? null : "muestras",
    proximoSeguimiento: input.datos.proximo_seguimiento,
  });
}

export async function anadirNota(input: { usuaria: Usuaria; leadId: string; datos: NotaSeguimiento }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  if (!input.datos.nota) return { ok: false, error: "Escribe la nota." };
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "nota",
    nota: input.datos.nota,
    proximoSeguimiento: input.datos.proximo_seguimiento,
  });
}

export async function cambiarFaseManual(input: { usuaria: Usuaria; leadId: string; cambio: CambioFase }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  if (lead.fase === input.cambio.fase) return { ok: true };
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "cambio_fase",
    nota: input.cambio.nota,
    faseNueva: input.cambio.fase,
  });
}
