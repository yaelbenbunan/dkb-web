"use client";
import { useEffect, useState } from "react";
import { InformativaSectorTemplate } from "../imagina-tu-web/_components/templates/InformativaSectorTemplate";
import { EditorialLimpioTemplate } from "../imagina-tu-web/_components/templates/EditorialLimpioTemplate";
import type { SectorInformativaCopyResponse } from "@/lib/preview-validation";

// TEMP showcase to compare the 3 web styles with invented data. Delete after.

const data = {
  businessName: "Gabinete Atlas",
  sector: "servicios",
  offerings: [
    "Asesoría fiscal",
    "Gestión laboral",
    "Contabilidad",
    "Constitución de empresas",
    "Asesoría mercantil",
    "Subvenciones",
  ],
  palette: "azul-electrico",
  typography: "moderna-sans",
  valueProp: "Asesoría cercana para autónomos y pymes.",
  address: "Calle Mayor 12",
  city: "Madrid",
};

const copy: SectorInformativaCopyResponse = {
  heroHeadline: "Tu negocio, en las mejores manos",
  heroTagline:
    "Asesoría fiscal, laboral y contable para autónomos y pymes. Respuesta clara y sin letra pequeña, para que tú te dediques a lo tuyo.",
  ctaText: "Solicita presupuesto",
  sectionTitle: "Nuestros servicios",
  offerings: [
    { name: "Asesoría fiscal", blurb: "Impuestos y planificación para que pagues lo justo, ni un euro de más." },
    { name: "Gestión laboral", blurb: "Nóminas, contratos y altas sin que tengas que preocuparte de un solo papel." },
    { name: "Contabilidad", blurb: "Tus cuentas al día y un cuadro claro de cómo va realmente tu negocio." },
    { name: "Constitución de empresas", blurb: "Montamos tu sociedad y te guiamos en cada trámite desde el primer día." },
    { name: "Asesoría mercantil", blurb: "Contratos y decisiones importantes con respaldo legal sólido." },
    { name: "Subvenciones y ayudas", blurb: "Buscamos las ayudas que encajan contigo y las tramitamos por ti." },
  ],
  valorAgregadoTitle: "Por qué confían en nosotros",
  valorAgregadoIntro:
    "Llevamos las cuentas de cientos de negocios con la misma cercanía con la que llevaríamos las nuestras.",
  bullets: [
    { title: "Trato directo", text: "Hablas siempre con tu asesor, no con un centro de llamadas." },
    { title: "Respuesta en 24h", text: "Resolvemos tus dudas sin hacerte esperar una semana." },
    { title: "Precios cerrados", text: "Sabes lo que pagas desde el primer día, sin sorpresas." },
    { title: "Todo en un sitio", text: "Fiscal, laboral y contable bajo el mismo techo." },
    { title: "Lenguaje claro", text: "Te lo explicamos en cristiano, sin tecnicismos vacíos." },
    { title: "Siempre al día", text: "Nos adelantamos a los cambios de normativa que te afectan." },
  ],
  team: [
    { name: "Marta Rivas", role: "Socia directora", gender: "female" },
    { name: "Javier Soler", role: "Asesor fiscal senior", gender: "male" },
    { name: "Lucía Méndez", role: "Responsable laboral", gender: "female" },
    { name: "Pablo Iglesias", role: "Contabilidad", gender: "male" },
  ],
  testimonials: [
    { name: "Andrés L.", text: "Desde que llevo todo con Gabinete Atlas duermo tranquilo. Cercanía y rapidez de verdad." },
    { name: "María G.", text: "Me ahorraron tiempo y dinero en la primera reunión. Explican todo clarísimo." },
    { name: "Sergio P.", text: "Profesionales y muy accesibles. Resuelven en horas lo que otros tardaban días." },
  ],
};

export default function Showcase() {
  const [v, setV] = useState("moderno");
  useEffect(() => {
    setV(new URLSearchParams(window.location.search).get("v") || "moderno");
  }, []);
  if (v === "editorial")
    return <EditorialLimpioTemplate data={data} copy={copy} density="spacious" />;
  if (v === "compacto")
    return <EditorialLimpioTemplate data={data} copy={copy} density="compact" />;
  return <InformativaSectorTemplate data={data} copy={copy} />;
}
