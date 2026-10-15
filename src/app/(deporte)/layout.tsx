import Image from "next/image";
import Link from "next/link";
import { Anton } from "next/font/google";
import { WhatsAppBubble } from "@/components/layout/WhatsAppBubble";
import { PD } from "@/components/proveedores-deportivos/tema";
import { CONTACT_INFO } from "@/lib/contact-info";

/** Titulares gruesos y condensados, de marca deportiva. Solo se carga aquí. */
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-pd-titulo" });

/**
 * Layout de la landing de proveedores deportivos: oscuro siempre y sin la
 * navegación de dinkbit, como el de Growth. Recibe tráfico de pago desde
 * Instagram y Facebook, y cada enlace de salida es gente que no rellena el
 * formulario. La firma de dinkbit va arriba (logo) y en el pie.
 */
export default function DeporteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={anton.variable} style={{ background: PD.bg, color: PD.texto, minHeight: "100svh" }}>
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 md:h-20">
          <Link href="/" aria-label="dinkbit — inicio">
            <Image src="/img/logo/dinkbit.svg" alt="dinkbit" width={110} height={33} priority className="h-8 w-[110px] brightness-0 invert" />
          </Link>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="px-4 py-10 text-center text-sm sm:px-6" style={{ borderTop: `1px solid ${PD.linea}`, color: PD.suave }}>
        <Image src="/img/logo/dinkbit.svg" alt="dinkbit" width={96} height={29} className="mx-auto h-7 w-[96px] brightness-0 invert" />
        <p className="mt-4">
          <a href={`mailto:${CONTACT_INFO.email}`} className="underline underline-offset-4">
            {CONTACT_INFO.email}
          </a>
        </p>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/aviso-legal" className="underline underline-offset-4">
            Aviso legal
          </Link>
          <Link href="/privacidad" className="underline underline-offset-4">
            Política de privacidad
          </Link>
          <Link href="/cookies" className="underline underline-offset-4">
            Cookies
          </Link>
        </p>
      </footer>

      <WhatsAppBubble />
    </div>
  );
}
