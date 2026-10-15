import Image from "next/image";
import { PD_BADGE, PD_PRECIO, PD_PRECIO_SUFIJO } from "@/lib/proveedores-deportivos";
import { FormularioPack } from "./FormularioPack";
import { Icono, type NombreIcono } from "./Iconos";
import { PD, TITULO } from "./tema";

const COLLAGE = ["hero-pelotas", "hero-camisetas", "hero-magnesio", "hero-toallas"] as const;

const BULLETS: { icono: NombreIcono; texto: string }[] = [
  { icono: "megafono", texto: "Campaña en Meta lista para captar centros deportivos" },
  { icono: "crm", texto: "CRM para gestionar cada lead, muestra y pedido" },
  { icono: "euro", texto: `Todo por ${PD_PRECIO} ${PD_PRECIO_SUFIJO}` },
];

export const TITULAR = "Llenamos tu agenda de gimnasios y clubes que quieren tu producto";

/**
 * Hero a pantalla completa: collage de producto detrás (en vez de vídeo, que en
 * un móvil con datos tarda y no aporta más) y el formulario a la derecha, o
 * debajo en móvil. El collage se desplaza muy despacio; con
 * `prefers-reduced-motion` se queda quieto.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <style>{`
        @keyframes pd-deriva { from { transform: scale(1.06) translate3d(0,0,0) } to { transform: scale(1.06) translate3d(-3%,-2%,0) } }
        .pd-collage { animation: pd-deriva 18s ease-in-out infinite alternate }
        @media (prefers-reduced-motion: reduce) { .pd-collage { animation: none } }
      `}</style>
      <div aria-hidden className="pd-collage absolute inset-0 -z-20 grid grid-cols-2 grid-rows-2">
        {COLLAGE.map((f) => (
          <div key={f} className="relative">
            <Image src={`/img/deporte/${f}.webp`} alt="" fill priority sizes="50vw" className="object-cover" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgba(11,12,14,.80) 0%, rgba(11,12,14,.88) 55%, rgba(11,12,14,1) 100%)" }} />

      <div className="mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-4 pb-16 pt-24 sm:px-6 md:pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div>
          <span className="inline-block rounded-full px-4 py-1.5 text-[12px] font-extrabold tracking-[0.08em] text-white sm:text-[13px]" style={{ background: PD.acento }}>
            {PD_BADGE}
          </span>
          <h1 className="mt-5 text-[44px] uppercase leading-[0.95] sm:text-[56px] lg:text-[72px]" style={TITULO}>
            {TITULAR}
          </h1>
          <p className="mt-5 max-w-xl text-[18px] font-semibold leading-snug sm:text-[20px]" style={{ color: PD.suave }}>
            Campañas en Meta + muestras gratis = <span style={{ color: PD.texto }}>pedidos recurrentes de centros deportivos</span>
          </p>
          <ul className="mt-7 space-y-3">
            {BULLETS.map((b) => (
              <li key={b.icono} className="flex items-center gap-3 text-[16px] font-semibold sm:text-[17px]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(24,123,239,.16)", color: PD.acentoClaro }}>
                  <Icono nombre={b.icono} className="h-5 w-5" />
                </span>
                {b.texto}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-[28px] uppercase leading-none sm:text-[34px]" style={TITULO}>
            Solicita tu Pack Campaña + CRM
          </h2>
          <FormularioPack />
        </div>
      </div>
    </section>
  );
}
