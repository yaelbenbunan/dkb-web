import Image from "next/image";
import Link from "next/link";
import { CONTACT_INFO } from "@/lib/contact-info";

/**
 * Layout del formulario de alta de clientes (/alta/<token>): con la marca de
 * dinkbit pero sin la navegación del sitio ni el popup de promociones. Quien
 * llega aquí ya es cliente y viene a rellenar un formulario largo. Superficie
 * clara fija (no depende del tema): es un formulario y tiene que leerse bien.
 */
export default function AltaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#0b3ae7]">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/" aria-label="dinkbit — inicio">
            <Image src="/img/logo/dinkbit.svg" alt="dinkbit" width={110} height={33} priority className="h-8 w-[110px] brightness-0 invert" />
          </Link>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-600 sm:px-6">
        <p>
          ¿Dudas? Escríbenos a{" "}
          <a href={`mailto:${CONTACT_INFO.email}`} className="font-semibold text-[#0b3ae7] underline underline-offset-4">
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
        </p>
      </footer>
    </div>
  );
}
