import { WhatsAppBubble } from "@/components/layout/WhatsAppBubble";
import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Layout propio del producto, deliberadamente ajeno al resto de dinkbit.
 *
 * No lleva el logo ni la navegación de la agencia: esta landing recibe tráfico
 * de pago y compite contra cientos de "te llenamos la agenda", así que tiene
 * que parecer un producto y no una sección más de una web corporativa. La
 * atribución a dinkbit vive en el pie, que es donde alguien va a buscar quién
 * hay detrás si le interesa.
 *
 * Los colores se fijan aquí en línea y no con los tokens del tema: ver el
 * porqué en GROWTH_THEME.
 */
export default function GrowthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ background: T.ink, color: T.fg, minHeight: "100svh" }}>
      <main id="main-content">{children}</main>

      <footer
        className="px-6 py-10 text-center text-sm"
        style={{ borderTop: `1px solid ${T.line}`, color: T.muted }}
      >
        <p>
          Un producto de{" "}
          <a href="/" className="underline underline-offset-4">
            dinkbit
          </a>
          <span className="mx-2">·</span>
          <a href="/aviso-legal" className="underline underline-offset-4">
            Aviso legal
          </a>
          <span className="mx-2">·</span>
          <a href="/privacidad" className="underline underline-offset-4">
            Privacidad
          </a>
          <span className="mx-2">·</span>
          <a href="/cookies" className="underline underline-offset-4">
            Cookies
          </a>
        </p>
      </footer>

      <WhatsAppBubble />
    </div>
  );
}
