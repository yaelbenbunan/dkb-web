import "server-only";
import { mintUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe-token";

const SITE = "https://www.dinkbit.es";

/** Mismo HMAC que la baja de los leads, con un prefijo en lo que se firma: así
 *  un token de prospecto no vale en `/api/unsubscribe` ni al revés. */
const sujeto = (prospectoId: string) => `prospecto:${prospectoId}`;

export function urlDeBaja(prospectoId: string): string {
  const token = mintUnsubscribeToken(sujeto(prospectoId));
  return `${SITE}/api/prospeccion/baja?id=${encodeURIComponent(prospectoId)}&token=${token}`;
}

export function verificarTokenBaja(prospectoId: string, token: string): boolean {
  return verifyUnsubscribeToken(sujeto(prospectoId), token);
}

/** ¿Se puede firmar un enlace de baja? Sin secreto el token sale vacío y el
 *  enlace no serviría: en ese caso no debe enviarse ningún correo. */
export function bajaDisponible(): boolean {
  return mintUnsubscribeToken(sujeto("prueba")) !== "";
}
