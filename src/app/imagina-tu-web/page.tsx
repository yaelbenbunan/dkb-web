import type { Metadata } from "next";
import {
  Inter,
  Space_Grotesk,
  Playfair_Display,
  Fraunces,
  Source_Sans_3,
} from "next/font/google";
import { PreviewWizard } from "./_components/PreviewWizard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-prev-inter",
  display: "swap",
});
const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-prev-space",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-prev-playfair",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-prev-fraunces",
  display: "swap",
});
const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-prev-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Imagina tu web",
  description:
    "Cuéntanos un poco sobre tu negocio y te mostramos al momento cómo podría ser el home de tu web.",
  robots: { index: false, follow: false },
};

export default function ImaginaPage() {
  const fontVars = [
    inter.variable,
    space.variable,
    playfair.variable,
    fraunces.variable,
    source.variable,
  ].join(" ");

  return (
    <div className={fontVars}>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            Vista rápida
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl">
            Imagina tu web en un vistazo
          </h1>
          <p className="mt-4 text-base text-fg-muted sm:text-lg">
            6 preguntas cortas y te mostramos cómo podría ser el home de tu
            negocio. Sin compromiso.
          </p>
        </div>
        <PreviewWizard />
      </section>
    </div>
  );
}
