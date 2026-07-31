import type { BrandedEmailInput } from "./email-layout";
import { BRAND } from "./email-layout";

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

/** Formulario rápido del Home (hero): nombre, teléfono, email y servicio. */
export function homeHeroAutoresponder(input: {
  name?: string | null;
  service?: string | null;
}): BrandedEmailInput {
  return {
    subject: "Hemos recibido tu solicitud",
    eyebrow: "Solicitud",
    heading: "Hemos recibido tu solicitud",
    name: input.name,
    intro: input.service
      ? `gracias por interesarte en ${input.service.toLowerCase()}. Ya tenemos tus datos y te respondemos en menos de 24 horas laborables.`
      : "gracias por contarnos lo que necesitas. Ya tenemos tus datos y te respondemos en menos de 24 horas laborables.",
    preheader: "Te respondemos en menos de 24 horas laborables.",
    bulletsLabel: "Qué pasa ahora",
    bullets: [
      "Revisamos lo que nos has contado.",
      "Te llamamos o escribimos para concretar los detalles.",
      "Te preparamos una propuesta sin compromiso.",
    ],
    cta: { label: "Ver trabajos que hemos hecho", url: CASOS_URL },
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
      "gracias por escribirnos. Tu mensaje ya está con nosotros y te respondemos en menos de 24 horas laborables.",
    preheader: "Tu mensaje ya está con nosotros.",
    bulletsLabel: "Qué pasa ahora",
    bullets: [
      "Leemos tu mensaje y vemos quién puede ayudarte mejor.",
      "Te respondemos por email o te llamamos, como prefieras.",
      "Si hace falta, agendamos una llamada para verlo con calma.",
    ],
    cta: { label: "Ver trabajos que hemos hecho", url: CASOS_URL },
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
      "Revisamos tu perfil y qué ayudas te encajan.",
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
    subject: "Hemos recibido tu información — Puesto Seguro",
    eyebrow: "Puesto Seguro",
    heading: "Hemos recibido tu información",
    name: input.name,
    intro:
      "gracias por confiar en nosotros. Ya tenemos todos tus datos y vamos a darte de alta en la plataforma de Puesto Seguro.",
    preheader: "Te damos de alta en la plataforma y te escribimos con los pasos.",
    bulletsLabel: "Qué pasa ahora",
    bullets: [
      "Damos de alta tu Puesto Seguro en la plataforma.",
      "Recibirás un correo con los pasos a seguir para activarlo.",
      "Estate pendiente de tu bandeja de entrada — revisa también la carpeta de spam.",
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
    heading: "Hemos recibido tu solicitud",
    name: input.name,
    intro:
      "gracias por contarnos sobre tu negocio. Preparamos una propuesta a tu medida y te llamamos en menos de 24 horas laborables.",
    preheader: "Te llamamos en menos de 24 horas laborables.",
    bulletsLabel: "Qué pasa ahora",
    bullets: [
      "Estudiamos tu negocio y qué necesitas de verdad.",
      "Te llamamos para afinar el presupuesto contigo.",
      "Te pasamos la propuesta por escrito, sin compromiso.",
    ],
    cta: { label: "Ver trabajos que hemos hecho", url: CASOS_URL },
  };
}
