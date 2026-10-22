import "server-only";
import { Resend } from "resend";
import { destinatariosAviso } from "../avisos-internos";

const PANEL_ALTAS = "https://www.dinkbit.es/panel/ventas/altas";

/** El nombre del cliente va en el asunto: fuera saltos de línea y control. */
function enLinea(texto: string): string {
  return texto.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

/**
 * Aviso interno de que un cliente ha enviado su alta, como los demás avisos
 * del sitio (RESEND_API_KEY / CONTACT_EMAIL_FROM / CONTACT_EMAIL_TO). Nunca
 * lanza: si el correo falla, el envío del formulario ya está guardado.
 */
export async function avisarAltaEnviada(a: { id: string; cliente: string; primeraVez: boolean; archivos: number }): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_EMAIL_FROM;
    const to = destinatariosAviso(process.env.CONTACT_EMAIL_TO);
    if (!apiKey || !from || to.length === 0) {
      console.error("[altas/aviso] falta RESEND_API_KEY, CONTACT_EMAIL_FROM o CONTACT_EMAIL_TO: no se avisa.");
      return;
    }
    const cliente = enLinea(a.cliente) || "Un cliente";
    const enlace = `${PANEL_ALTAS}/${a.id}`;
    await new Resend(apiKey).emails.send({
      from,
      to,
      subject: a.primeraVez ? `${cliente} ha completado su alta` : `${cliente} ha actualizado su alta`,
      text: [
        a.primeraVez
          ? `${cliente} ha completado el formulario de alta.`
          : `${cliente} ha vuelto a enviar el formulario de alta: las respuestas anteriores se han sustituido.`,
        `Archivos adjuntos: ${a.archivos}.`,
        "",
        `Respuestas y archivos: ${enlace}`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[altas/aviso] no se pudo enviar el aviso", error);
  }
}
