import "server-only";
import { ALLOWED_SENDERS } from "@/lib/campaign-send";
import { remitentesDeMarca } from "@/lib/ventas/campanas";
import type { Marca } from "@/lib/ventas/db";
import type { AccionesCampana } from "../../../../_campanas/AccionesCampana";
import {
  cancelarProgramacionCampanaAction,
  crearBorradorCampanaAction,
  editarCampanaAction,
  enviarCampanaAction,
  enviarPruebaCampanaAction,
  generarCampanaAction,
  guardarBloquesCampanaAction,
  guardarDatosCampanaAction,
  guardarPlantillaCampanaAction,
  programarCampanaAction,
  subirImagenCampanaAction,
} from "../../../acciones-campanas";

/** Las acciones del asistente atadas a la marca: cada una vuelve a comprobar
 *  en el servidor permiso, módulo y que la campaña sea de esta marca. */
export function accionesDeMarca(marca: Marca): AccionesCampana {
  const slug = marca.slug;
  return {
    rutaBase: `/panel/ventas/${slug}/campanas`,
    remitentes: remitentesDeMarca(marca, ALLOWED_SENDERS),
    crearBorrador: crearBorradorCampanaAction.bind(null, slug),
    generar: generarCampanaAction.bind(null, slug),
    editar: editarCampanaAction.bind(null, slug),
    guardarBloques: guardarBloquesCampanaAction.bind(null, slug),
    guardarComoPlantilla: guardarPlantillaCampanaAction.bind(null, slug),
    guardarDatos: guardarDatosCampanaAction.bind(null, slug),
    enviarPrueba: enviarPruebaCampanaAction.bind(null, slug),
    enviar: enviarCampanaAction.bind(null, slug),
    programar: programarCampanaAction.bind(null, slug),
    cancelarProgramacion: cancelarProgramacionCampanaAction.bind(null, slug),
    subirImagen: subirImagenCampanaAction.bind(null, slug),
  };
}
