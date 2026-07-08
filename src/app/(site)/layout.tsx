import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppBubble } from "@/components/layout/WhatsAppBubble";
import { PromoPopup } from "@/components/promo/PromoPopup";

/**
 * Layout del sitio "completo": header con navegación, footer y burbuja de
 * WhatsApp. Envuelve todas las páginas salvo las landings de captación, que
 * viven en el grupo (landing) con un chrome reducido para maximizar conversión.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-[calc(100vh-5rem)]">
        {children}
      </main>
      <Footer />
      <WhatsAppBubble />
      <PromoPopup />
    </>
  );
}
