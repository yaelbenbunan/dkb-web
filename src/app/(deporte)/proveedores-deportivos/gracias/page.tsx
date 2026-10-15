import type { Metadata } from "next";
import Link from "next/link";
import { PD, TITULO } from "@/components/proveedores-deportivos/tema";
import { CONTACT_INFO } from "@/lib/contact-info";
import { PD_PATH } from "@/lib/proveedores-deportivos";

export const metadata: Metadata = {
  title: "Solicitud recibida",
  robots: { index: false, follow: false },
};

const WHATSAPP = `${CONTACT_INFO.socials.whatsapp}?text=${encodeURIComponent("Hola, acabo de pedir el Pack Campaña + CRM")}`;

export default function GraciasPage() {
  return (
    <section className="mx-auto flex min-h-[100svh] max-w-xl flex-col items-center justify-center px-4 py-28 text-center sm:px-6">
      <p className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: PD.acentoClaro }}>
        Pack Campaña + CRM
      </p>
      <h1 className="mt-3 text-[48px] uppercase leading-[0.95] sm:text-[64px]" style={TITULO}>
        Solicitud recibida
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed" style={{ color: PD.suave }}>
        Te respondemos en menos de 24 h con los siguientes pasos para tu campaña. Si tienes prisa, escríbenos ahora.
      </p>
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener"
        className="mt-8 inline-flex min-h-[56px] items-center justify-center rounded-xl px-8 text-[17px] font-extrabold uppercase tracking-[0.04em] text-white"
        style={{ background: PD.acento }}
      >
        Escríbenos por WhatsApp
      </a>
      <Link href={PD_PATH} className="mt-5 text-[14px] underline underline-offset-4" style={{ color: PD.suave }}>
        Volver
      </Link>
    </section>
  );
}
