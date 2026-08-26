import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

/** Bucket PÚBLICO. Las imágenes de un email las descarga el cliente de correo
 *  del destinatario (Gmail incluso las cachea en su propio proxy), así que no
 *  pueden vivir detrás de una URL firmada que caduca. Se crea con el SQL de
 *  docs/sql/2026-08-26-campaign-images-bucket.sql. */
const BUCKET = "campaign-images";

/** Formatos que entienden todos los clientes de correo. SVG queda fuera a
 *  propósito: puede llevar scripts dentro y casi ningún cliente lo pinta. */
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** 5 MB. Por encima de eso hay clientes que recortan el email entero. */
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Sube una imagen al bucket público y devuelve su URL definitiva. */
export async function uploadCampaignImage(
  campaignId: string,
  file: File,
): Promise<UploadImageResult> {
  const ext = ALLOWED[file.type];
  if (!ext) {
    return { ok: false, error: "Formato no admitido. Usa PNG, JPG, GIF o WEBP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "La imagen pesa más de 5 MB. Compáctala antes de subirla." };
  }

  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "Supabase no está configurado en el servidor." };

  // Nombre irrepetible: si se sustituye la imagen, la URL cambia y ningún
  // cliente de correo sirve la versión vieja desde su caché.
  const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, "") || "sin-campana";
  const path = `${safeId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    console.error("[campaign-images] upload error:", error.message);
    const missingBucket = /bucket.*not.*found/i.test(error.message);
    return {
      ok: false,
      error: missingBucket
        ? `Falta el bucket "${BUCKET}" en Supabase. Ejecuta docs/sql/2026-08-26-campaign-images-bucket.sql.`
        : "No se pudo subir la imagen. Inténtalo de nuevo.",
    };
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { ok: false, error: "La imagen se subió pero no se pudo obtener su URL." };
  }
  return { ok: true, url: data.publicUrl };
}
