import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { WhatsAppBubble } from "@/components/layout/WhatsAppBubble";
import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Tipografía propia de Growth, cargada solo aquí.
 *
 * El resto de dinkbit —y la landing de Escala— van en Source Sans. Una letra
 * distinta es lo primero que separa dos marcas antes de leer una palabra, y
 * Plus Jakarta Sans tiene la redondez de una marca de salud sin parecer una
 * plantilla.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * Layout propio del producto, deliberadamente ajeno al resto de dinkbit.
 *
 * No lleva el logo ni la navegación de la agencia: esta landing recibe tráfico
 * de pago y tiene que parecer un producto y no una sección más de una web
 * corporativa. La atribución a dinkbit vive en el pie.
 *
 * Los colores se fijan aquí en línea y no con los tokens del tema: ver el
 * porqué en GROWTH_THEME.
 */
export default function GrowthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={jakarta.className}
      style={
        {
          background: T.bg,
          color: T.fg,
          minHeight: "100svh",
          // El CSS global pone `font-display` en todos los h1–h4, y Tailwind lo
          // compila ya resuelto a `var(--font-source-sans)`: la letra de
          // dinkbit y de Escala. Sin esto, los titulares de Growth salían en
          // ella aunque el resto de la página no. Solo afecta dentro de Growth.
          "--font-source-sans": jakarta.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <main id="main-content">{children}</main>

      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ borderTop: `1px solid ${T.line}`, color: T.muted, background: T.bg }}
      >
        <p>
          Un producto de{" "}
          <Link href="/" className="font-semibold underline underline-offset-4">
            dinkbit
          </Link>
          <span className="mx-2">·</span>
          <Link href="/aviso-legal" className="underline underline-offset-4">
            Aviso legal
          </Link>
          <span className="mx-2">·</span>
          <Link href="/privacidad" className="underline underline-offset-4">
            Privacidad
          </Link>
          <span className="mx-2">·</span>
          <Link href="/cookies" className="underline underline-offset-4">
            Cookies
          </Link>
        </p>
      </footer>

      <WhatsAppBubble />
    </div>
  );
}
