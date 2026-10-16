import "server-only";
import { ALLOWED_SENDERS } from "@/lib/campaign-send";
import type { AmbitoMarca, CampaignRow } from "@/lib/campaigns";
import { campanaEsDeMarca } from "@/lib/ventas/campanas";
import { getMarcaPorSlug, type Marca } from "@/lib/ventas/db";
import { MARCA_DINKBIT_SLUG } from "@/lib/ventas/dominio";
import type { AccionesCampana } from "../_campanas/AccionesCampana";
import {
  cancelScheduleAction,
  createDraftAction,
  editAction,
  generateAction,
  saveAsTemplateAction,
  saveBlocksAction,
  scheduleCampaignAction,
  sendCampaignAction,
  sendTestAction,
  setCampaignMetaAction,
  uploadCampaignImageAction,
} from "./actions";

/**
 * El /panel viejo es el de dinkbit: desde que las campañas son un módulo de
 * ventas por marca (2026-10-16), aquí solo se ven las de dinkbit y las que no
 * tienen marca. Se retira en el proyecto 4 de la unificación del CRM.
 */
async function marcaDinkbit(): Promise<Marca | null> {
  try {
    return await getMarcaPorSlug(MARCA_DINKBIT_SLUG);
  } catch (error) {
    console.error("[panel/campanas] no se pudo leer la marca dinkbit", error);
    return null;
  }
}

/** Ámbito para listar campañas y plantillas; sin marca dinkbit, todo (como antes). */
export async function ambitoDinkbit(): Promise<AmbitoMarca | undefined> {
  const marca = await marcaDinkbit();
  return marca ? { marcaId: marca.id, incluirSinMarca: true } : undefined;
}

/** Si la campaña se puede abrir desde el /panel viejo. */
export async function esCampanaDeDinkbit(campaign: CampaignRow): Promise<boolean> {
  const marca = await marcaDinkbit();
  if (!marca) return !campaign.marca_id;
  return campanaEsDeMarca(campaign, marca);
}

export const ACCIONES_PANEL: AccionesCampana = {
  rutaBase: "/panel/campanas",
  remitentes: ALLOWED_SENDERS,
  crearBorrador: createDraftAction,
  generar: generateAction,
  editar: editAction,
  guardarBloques: saveBlocksAction,
  guardarComoPlantilla: saveAsTemplateAction,
  guardarDatos: setCampaignMetaAction,
  enviarPrueba: sendTestAction,
  enviar: sendCampaignAction,
  programar: scheduleCampaignAction,
  cancelarProgramacion: cancelScheduleAction,
  subirImagen: uploadCampaignImageAction,
};
