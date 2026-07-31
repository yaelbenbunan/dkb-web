import type { BrandedEmailInput } from "./email-layout";
import { BRAND } from "./email-layout";
import { CONTACT_INFO } from "./contact-info";

/**
 * Textos de los acuses de recibo que se mandan al lead tras rellenar cada
 * formulario de la web.
 *
 * Están juntos a propósito: son variaciones del mismo mensaje ("te hemos
 * leído, esto es lo que pasa ahora") y tenerlos a la vista es la única forma
 * de que el tono no se desvíe entre formularios. La maquetación la pone
 * renderBrandedEmail(); aquí solo vive el copy.
 */

const CASOS_URL = `${BRAND.siteUrl}/casos-de-exito`;

/**
 * Atajo a WhatsApp para los formularios en los que la persona está esperando
 * que la llamemos: le damos una vía más rápida si no quiere esperar. No se
 * pone en los que ya han terminado un trámite, donde solo añadiría ruido.
 */
const WHATSAPP_CTA = {
  label: "Escríbenos por WhatsApp",
  url: CONTACT_INFO.socials.whatsapp,
} as const;

/**
 * Formulario rápido del Home (hero). Solo pide nombre, teléfono, email y
 * servicio, así que el correo no puede fingir que sabe lo que necesita esta
 * persona: da las gracias, promete contacto y ofrece WhatsApp por si tiene
 * prisa. Sin viñetas: no hay proceso que explicar todavía.
 */
export function homeHeroAutoresponder(input: {
  name?: string | null;
  service?: string | null;
}): BrandedEmailInput {
  return {
    subject: "Hemos recibido tu solicitud",
    eyebrow: "Solicitud",
    heading: "Gracias por tu interés",
    name: input.name,
    intro: input.service
      ? `gracias por tu interés en **${input.service}**. Nos pondremos en contacto contigo **en menos de 24 horas** para que nos cuentes con calma qué necesitas.`
      : "gracias por tu interés. Nos pondremos en contacto contigo **en menos de 24 horas** para que nos cuentes con calma qué necesitas.",
    preheader: "Te contactamos en menos de 24 horas.",
    cta: WHATSAPP_CTA,
  };
}

/** Formulario de la página de contacto. */
export function contactAutoresponder(input: { name?: string | null }): BrandedEmailInput {
  return {
    subject: "Gracias por escribirnos",
    eyebrow: "Contacto",
    heading: "Hemos recibido tu mensaje",
    name: input.name,
    intro:
      "gracias por escribirnos. Te responderemos **en menos de 24 horas** laborables. Si tienes prisa, escríbenos por WhatsApp y lo vemos al momento.",
    preheader: "Te responderemos en menos de 24 horas laborables.",
    cta: WHATSAPP_CTA,
  };
}

/**
 * Landing /kit-digital-2026 (lista de espera). Solo se manda a quien llega
 * directo: si el lead venía de Meta ya recibió el correo de "casi está" y
 * escribirle otra vez sería redundante.
 */
export function kitDigital2026Autoresponder(input: {
  name?: string | null;
}): BrandedEmailInput {
  return {
    subject: "Tu solicitud del Kit Digital está registrada",
    eyebrow: "Kit Digital",
    heading: "Solicitud registrada",
    name: input.name,
    intro:
      "ya tenemos todos tus datos. En cuanto se reactive la convocatoria del Kit Digital serás de los primeros en enterarte.",
    preheader: "Te avisamos en cuanto se abra la convocatoria.",
    bulletsLabel: "Qué pasa ahora",
    bullets: [
      // Nada de "revisamos tu perfil y qué ayudas te encajan": eso ocurre una vez
      // concedido el bono, no ahora, y prometerlo aquí adelanta un paso que no toca.
      "Te avisamos en cuanto se publique la convocatoria oficial.",
      "Nos encargamos de toda la tramitación por ti.",
    ],
    cta: { label: "Ver trabajos que hemos hecho", url: CASOS_URL },
  };
}

/**
 * Landing de Puesto Seguro (equipo + tramitación del bono del Kit Digital).
 * No es un lead de captación sino un alta: la persona ya tiene el bono y nos
 * ha encargado el trámite, así que el correo confirma recepción y le avisa de
 * que los pasos siguientes llegarán por email desde la plataforma.
 */
export function puestoSeguroAutoresponder(input: {
  name?: string | null;
}): BrandedEmailInput {
  return {
    subject: "Hemos recibido tu información",
    eyebrow: "Puesto Seguro",
    heading: "Hemos recibido tu información",
    name: input.name,
    intro:
      "gracias por confiar en nosotros. Ya tenemos todos tus datos y vamos a darte de alta en la plataforma para tramitar la solicitud de tu equipo.",
    preheader: "Te damos de alta en la plataforma y te escribimos con los pasos.",
    bulletsLabel: "Qué pasa ahora",
    bullets: [
      "Te damos de alta en la plataforma para solicitar tu Puesto Seguro.",
      "Recibirás un correo con los pasos a seguir. Estate pendiente de tu bandeja de entrada (revisa también la carpeta de spam).",
    ],
  };
}

/** Landing de captación de pago (Negocios locales). */
export function marketingLandingAutoresponder(input: {
  name?: string | null;
}): BrandedEmailInput {
  return {
    subject: "Hemos recibido tu solicitud de presupuesto",
    eyebrow: "Presupuesto",
    heading: "Gracias por tu interés",
    name: input.name,
    intro:
      "gracias por tu interés. Te llamaremos **en menos de 24 horas** laborables para conocer mejor tu negocio y qué necesitas. Con eso claro, te preparamos un presupuesto a tu medida y sin compromiso.",
    preheader: "Te llamamos para conocer tu negocio y prepararte un presupuesto.",
    cta: WHATSAPP_CTA,
  };
}
