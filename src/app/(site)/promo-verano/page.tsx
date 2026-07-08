import type { Metadata } from "next";
import { PromoEmailForm } from "@/components/promo/PromoEmailForm";
import { PROMO, promoDeadlineLabel } from "@/lib/promo-config";

export const metadata: Metadata = {
  title: `Promo Verano · Tu web o ecommerce al ${PROMO.discountPct}% | dinkbit`,
  description: `Este verano lanzamos todas nuestras webs y tiendas online con un ${PROMO.discountPct}% de descuento. Oferta válida hasta el ${promoDeadlineLabel()}.`,
};

const INCLUYE = [
  "Diseño web profesional a medida de tu negocio",
  "Adaptada a móvil, tablet y ordenador (responsive)",
  "Optimizada para aparecer en Google (SEO básico)",
  "Formularios de contacto y botones de WhatsApp",
  "Opción de tienda online (ecommerce) con pagos",
];

const FAQS = [
  {
    q: "¿En qué consiste el 50%?",
    a: "Aplicamos un 50% de descuento sobre el precio de nuestros proyectos de web y ecommerce durante toda la campaña de verano.",
  },
  {
    q: "¿Hasta cuándo puedo aprovecharla?",
    a: `La promoción es válida hasta el ${promoDeadlineLabel()}. Basta con dejar tu email dentro de ese plazo.`,
  },
  {
    q: "¿Qué pasa después de dejar mi email?",
    a: "Te enviamos por correo todos los detalles y un enlace a un breve cuestionario para contarnos sobre tu negocio. Con eso empezamos a diseñar tu web.",
  },
  {
    q: "¿Incluye los textos y las fotos?",
    a: "El diseño y desarrollo sí. Los contenidos (textos e imágenes) los aportas tú, y te ayudamos a organizarlos.",
  },
];

export default function PromoVeranoLanding() {
  const deadline = promoDeadlineLabel();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      {/* Hero */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Promo Verano · -{PROMO.discountPct}%
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-fg sm:text-4xl">
          Este verano, tu web o ecommerce al {PROMO.discountPct}% 🌴
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-fg-muted">
          Durante este verano lanzamos todas nuestras webs y tiendas online con un{" "}
          <strong className="text-fg">{PROMO.discountPct}% de descuento</strong>. Oferta
          válida hasta el <strong className="text-fg">{deadline}</strong>.
        </p>
      </div>

      {/* Captación */}
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border-strong/80 bg-bg-elevated p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] sm:p-8">
        <p className="mb-4 text-center text-sm font-semibold text-fg">
          Déjanos tu email y te enviamos toda la info 👇
        </p>
        <PromoEmailForm submitLabel="Quiero la info" />
      </div>

      {/* Qué incluye */}
      <section className="mt-16">
        <h2 className="text-xl font-bold text-fg">Qué incluye tu web</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {INCLUYE.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-fg-muted">
              <span aria-hidden className="mt-0.5 text-accent">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-xl font-bold text-fg">Preguntas frecuentes</h2>
        <div className="mt-4 flex flex-col gap-5">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <p className="text-sm font-semibold text-fg">{faq.q}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 text-center text-xs text-fg-muted">
        Al dejar tu email aceptas nuestra política de privacidad y el envío de
        comunicaciones comerciales. Puedes darte de baja cuando quieras.
      </p>
    </div>
  );
}
