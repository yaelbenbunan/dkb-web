import type { Metadata } from "next";
import {
  Inter,
  Space_Grotesk,
  Playfair_Display,
  Fraunces,
  Source_Sans_3,
  DM_Serif_Display,
  DM_Sans,
  Bebas_Neue,
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
const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-prev-dm-serif",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-prev-dm-sans",
  display: "swap",
});
const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-prev-bebas",
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
    dmSerif.variable,
    dmSans.variable,
    bebas.variable,
  ].join(" ");

  return (
    <div className={fontVars}>
      <PreviewWizard />
    </div>
  );
}
