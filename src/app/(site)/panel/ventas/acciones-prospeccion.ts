"use server";

import { revalidatePath } from "next/cache";
import {
  borrarPlantilla,
  cerrarBusqueda,
  contarPendientes,
  crearBusqueda,
  enlazarLead,
  getProspecto,
  guardarEnriquecimiento,
  guardarPlantilla,
  guardarProspectos,
  marcarEstado,
  pendientesDeEnriquecer,
} from "@/lib/prospeccion/db";
import { categoriaPorClave } from "@/lib/prospeccion/categorias";
import { enriquecerProspecto } from "@/lib/prospeccion/enriquecer";
import { enviarProspectos, type ErrorEnvio } from "@/lib/prospeccion/enviar";
import { buscarNegocios } from "@/lib/prospeccion/busqueda";
import type { ErrorOsm } from "@/lib/prospeccion/osm";
import { TEXTO_BLOQUEO } from "@/lib/prospeccion/reglas-envio";
import { resumirOmitidos } from "@/lib/prospeccion/resumen-envio";
import { ESTADOS_DESCARTABLES } from "@/lib/prospeccion/tipos";
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import { pasarProspectoAlEmbudo } from "@/lib/ventas/prospeccion";
import { tieneProspeccion } from "@/lib/ventas/rutas";

/** Pestaña de Prospección de la marca. Las tablas `prospect_*` son de dinkbit,
 *  la única marca con prospección por ahora (ver `MARCAS_CON_PROSPECCION`). */
const ruta = (slug: string) => `/panel/ventas/${slug}/prospeccion`;
const TANDA = 10;

type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

const SIN_CAMBIOS = {
  ok: false as const,
  error: "No se cambió ninguna: la lista estaba desactualizada. Se ha recargado.",
};
const SIN_GUARDAR = { ok: false as const, error: "No se pudo guardar el cambio. Vuelve a intentarlo." };

/** Estas acciones envían correo en nombre de dinkbit: cada una comprueba por sí
 *  misma el acceso de ventas a la sección `prospeccion` de la marca de la URL
 *  (admin y comercial; la clienta no) y que la marca tenga prospección, sin
 *  fiarse de que la página la haya filtrado. Sin exportar a propósito: en un
 *  fichero "use server" lo exportado es una acción que cualquiera puede llamar. */
async function acceso(slug: string) {
  const a = await accesoMarcaAccion(slug, "prospeccion");
  if (!a.ok) return a;
  if (!tieneProspeccion(a.marca.slug)) return { ok: false as const, error: "Esta marca no tiene prospección." };
  return a;
}

const TEXTO_ERROR: Record<ErrorEnvio, string> = {
  ...TEXTO_BLOQUEO,
  sin_remitente: "Falta configurar PROSPECT_SENDERS: sin un remitente de prospección no se envía.",
  remitente_no_permitido: "Ese remitente no está autorizado.",
  plantilla_no_encontrada: "La plantilla ya no existe.",
  tope_diario: "Se alcanzó el tope de envíos de hoy.",
  faltan_datos: "A la empresa le falta un dato que la plantilla usa",
  ya_reclamado: "Ya se le estaba enviando.",
  fallo_resend: "Resend rechazó el envío",
  error_datos: "No se pudo comprobar la lista de bajas, los leads o el tope de hoy. No se ha enviado; vuelve a intentarlo.",
  resultado_incierto: "No se sabe si el correo llegó a salir. Queda marcado como enviado para no escribir dos veces",
  email_repetido: "Ya se escribió a esa dirección desde otra ficha.",
  sin_baja: "No se puede firmar el enlace de baja (falta PROMO_TOKEN_SECRET o RESEND_API_KEY): no se envía.",
};

const ERROR_BUSQUEDA: Record<ErrorOsm, string> = {
  categoria_desconocida: "Ese tipo de negocio no está en la lista.",
  ciudad_no_encontrada: "No encuentro ese municipio en España. Revisa cómo está escrito.",
  error_api: "OpenStreetMap no ha respondido. Espera un minuto y vuelve a intentarlo.",
};

const NOMBRE_FUENTE = { overture: "Overture Maps", osm: "OpenStreetMap" } as const;

export async function buscarAction(
  slug: string,
  categoria: string,
  ciudad: string,
): Promise<{ ok: true; searchId: string; mensaje: string } | { ok: false; error: string }> {
  const a = await acceso(slug);
  if (!a.ok) return a;
  const cat = categoriaPorClave(categoria);
  const ciu = ciudad.trim().slice(0, 80);
  if (!cat || !ciu) return { ok: false, error: "Elige qué buscar y escribe la ciudad." };

  // Primero los lugares de Overture importados; si no hay, OpenStreetMap.
  const r = await buscarNegocios({ categoria: cat.clave, ciudad: ciu });
  // En la búsqueda se guarda el nombre legible: es lo que enseña el filtro.
  const params = { categoria: cat.texto, clave: cat.clave, ciudad: ciu };
  if (!r.ok) {
    const error = ERROR_BUSQUEDA[r.error];
    const searchId = await crearBusqueda("osm", params);
    if (searchId) await cerrarBusqueda(searchId, { status: "error", error });
    revalidatePath(ruta(slug));
    return { ok: false, error };
  }

  const searchId = await crearBusqueda(r.fuente, { ...params, fuente: r.fuente });
  if (!searchId) return { ok: false, error: "No se pudo guardar la búsqueda." };

  const nuevas = await guardarProspectos(searchId, r.prospectos);
  if (nuevas === null) {
    const error = "No se pudieron guardar las empresas encontradas. ¿Está ejecutada la migración de prospección?";
    await cerrarBusqueda(searchId, { status: "error", error });
    revalidatePath(ruta(slug));
    return { ok: false, error };
  }
  await cerrarBusqueda(searchId, { status: "lista", total: r.prospectos.length });
  revalidatePath(ruta(slug));
  // Las que el upsert no insertó también estaban ya (carrera con otra búsqueda).
  const repetidas = r.repetidas + (r.prospectos.length - nuevas);
  const fuente = NOMBRE_FUENTE[r.fuente];
  return {
    ok: true,
    searchId,
    mensaje:
      (nuevas === 0
        ? `Ninguna empresa nueva (${fuente}).`
        : `${nuevas} empresa${nuevas === 1 ? " nueva" : "s nuevas"} (${fuente}).`) +
      (repetidas > 0 ? ` ${repetidas} que ya tenías.` : "") +
      (r.quedan > 0 ? ` Quedan ${r.quedan} más: repite la búsqueda para traerlas.` : ""),
  };
}

/** Busca el email de hasta diez empresas de la búsqueda. El cliente la llama en
 *  bucle hasta que `restantes` llega a cero: así ninguna petición es larga y la
 *  barra de progreso avanza de verdad. */
export async function enriquecerTandaAction(
  slug: string,
  searchId: string,
): Promise<{ procesados: number; restantes: number }> {
  if (!(await acceso(slug)).ok) return { procesados: 0, restantes: 0 };
  const tanda = await pendientesDeEnriquecer(searchId, TANDA);
  await Promise.all(
    tanda.map(async (p) => {
      const r = await enriquecerProspecto(p).catch(() => ({
        email: null,
        tipo: null,
        nota: "La web no responde.",
      }));
      await guardarEnriquecimiento(p.id, r);
    }),
  );
  const restantes = await contarPendientes(searchId);
  if (restantes === 0) revalidatePath(ruta(slug));
  // Si una tanda no avanzó (fallo de base de datos), se corta el bucle del cliente.
  return { procesados: tanda.length, restantes: tanda.length === 0 ? 0 : restantes };
}

export async function enviarAction(
  slug: string,
  ids: string[],
  plantillaId: string,
  from: string,
  confirmarPersonal: boolean,
): Promise<Resultado> {
  const a = await acceso(slug);
  if (!a.ok) return a;
  if (ids.length === 0) return { ok: false, error: "No hay ninguna empresa seleccionada." };
  if (!plantillaId) return { ok: false, error: "Elige una plantilla." };
  const r = await enviarProspectos(ids.slice(0, 200), plantillaId, { from, confirmarPersonal });
  revalidatePath(ruta(slug));
  if (!r.ok) return { ok: false, error: TEXTO_ERROR[r.error ?? "fallo_resend"] };

  const resumen = resumirOmitidos(r.omitidos, TEXTO_ERROR);
  if (r.enviados === 0) {
    return { ok: false, error: `No se envió ninguno. ${resumen}`.trim() };
  }
  return {
    ok: true,
    mensaje:
      `${r.enviados} enviado${r.enviados === 1 ? "" : "s"}.` +
      (r.omitidos.length > 0 ? ` ${r.omitidos.length} sin enviar. ${resumen}` : ""),
  };
}

/** Descarta desde cualquier estado salvo baja y rebotado. No puede provocar un
 *  segundo correo: descartar no borra `sent_at`, que es lo que mira el envío. */
export async function descartarAction(slug: string, ids: string[]): Promise<Resultado> {
  const a = await acceso(slug);
  if (!a.ok) return a;
  const cambiadas = await marcarEstado(ids, "descartado", ESTADOS_DESCARTABLES);
  revalidatePath(ruta(slug));
  if (cambiadas === null) return SIN_GUARDAR;
  if (cambiadas === 0) return SIN_CAMBIOS;
  return { ok: true, mensaje: `${cambiadas} descartada${cambiadas === 1 ? "" : "s"}.` };
}

export async function marcarRespondidoAction(slug: string, id: string): Promise<Resultado> {
  const a = await acceso(slug);
  if (!a.ok) return a;
  const cambiadas = await marcarEstado([id], "respondido", ["enviado"]);
  revalidatePath(ruta(slug));
  if (cambiadas === null) return SIN_GUARDAR;
  if (cambiadas === 0) return SIN_CAMBIOS;
  return { ok: true, mensaje: "Marcada como respondida." };
}

/** Pasa el prospecto al embudo de la marca: crea su lead en ventas, o lo
 *  enlaza con el que ya hay por email o teléfono. El consentimiento se queda
 *  sin definir: haber contestado a un correo no es aceptar campañas. */
export async function pasarAlEmbudoAction(slug: string, id: string): Promise<Resultado> {
  const a = await acceso(slug);
  if (!a.ok) return a;
  const p = await getProspecto(id);
  if (!p) return { ok: false, error: "Esa empresa ya no existe." };
  if (p.lead_id) return { ok: false, error: "Ya está en el embudo." };
  if (p.status !== "enviado" && p.status !== "respondido") {
    return { ok: false, error: "Solo se puede pasar al embudo una empresa a la que ya se le escribió." };
  }

  const r = await pasarProspectoAlEmbudo({ marca: a.marca, usuaria: a.usuaria, prospecto: p });
  if (!r.ok) return r;
  await enlazarLead(id, r.leadId);
  revalidatePath(ruta(slug));
  revalidatePath(`/panel/ventas/${slug}`, "layout");
  return {
    ok: true,
    mensaje: r.existia ? "Ya era un lead de la marca: queda enlazada con él." : `Pasada al embudo de ${a.marca.nombre}.`,
  };
}

export async function guardarPlantillaAction(slug: string, p: {
  id?: string;
  name: string;
  subject: string;
  body: string;
}): Promise<Resultado> {
  const a = await acceso(slug);
  if (!a.ok) return a;
  const name = p.name.trim().slice(0, 80);
  const subject = p.subject.trim().slice(0, 200);
  const body = p.body.trim().slice(0, 5000);
  if (!name || !subject || !body) return { ok: false, error: "Nombre, asunto y texto son obligatorios." };
  const ok = await guardarPlantilla({ id: p.id, name, subject, body });
  revalidatePath(ruta(slug));
  return ok ? { ok: true, mensaje: "Plantilla guardada." } : { ok: false, error: "No se pudo guardar." };
}

export async function borrarPlantillaAction(slug: string, id: string): Promise<Resultado> {
  const a = await acceso(slug);
  if (!a.ok) return a;
  const ok = await borrarPlantilla(id);
  revalidatePath(ruta(slug));
  return ok ? { ok: true, mensaje: "Plantilla borrada." } : { ok: false, error: "No se pudo borrar la plantilla." };
}
