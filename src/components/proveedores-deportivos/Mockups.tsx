import Image from "next/image";
import { PD } from "./tema";

/*
 * Mockups en HTML y CSS, de frente y sin perspectiva: enseñan lo que recibe el
 * cliente sin depender de capturas que se quedan viejas.
 */

/** Un post patrocinado de Instagram dentro de un móvil, con el formulario de muestra debajo. */
export function MovilAnuncio() {
  return (
    <div className="mx-auto w-[300px] max-w-full rounded-[2.5rem] border-[10px] p-0" style={{ borderColor: "#1c1f24", background: "#000", boxShadow: "0 40px 90px -40px rgba(24,123,239,.6)" }}>
      <div className="mx-auto mt-2 h-5 w-24 rounded-full" style={{ background: "#1c1f24" }} />
      <div className="mt-2 overflow-hidden rounded-b-[1.8rem] bg-white text-[#111]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="h-8 w-8 rounded-full" style={{ background: `linear-gradient(135deg, ${PD.acento}, ${PD.acentoClaro})` }} />
          <div className="leading-tight">
            <p className="text-[13px] font-bold">tumarca</p>
            <p className="text-[11px] text-[#666]">Publicidad</p>
          </div>
        </div>
        <div className="relative aspect-square">
          <Image src="/img/deporte/hero-pelotas.webp" alt="Caja de pelotas de pádel" fill sizes="280px" className="object-cover" />
        </div>
        <div className="flex items-center justify-between border-b border-[#eee] px-3 py-2.5">
          <span className="text-[13px] font-bold">Pedir muestra</span>
          <span className="text-[16px]">›</span>
        </div>
        <p className="px-3 py-2.5 text-[13px] leading-snug">
          <strong>tumarca</strong> ¿Tienes un club de pádel? Te enviamos una caja de pelotas para probar en tus pistas 🎾
        </p>
        <div className="mx-3 mb-4 rounded-xl border border-[#e5e5e5] p-3">
          <p className="text-[12px] font-bold">Pide tu muestra gratis</p>
          {["Nombre del club", "CIF o web", "Teléfono"].map((c) => (
            <div key={c} className="mt-2 rounded-md border border-[#e5e5e5] px-2 py-1.5 text-[11px] text-[#999]">
              {c}
            </div>
          ))}
          <div className="mt-2.5 rounded-md py-1.5 text-center text-[12px] font-bold text-white" style={{ background: PD.acento }}>
            Enviar
          </div>
        </div>
      </div>
    </div>
  );
}

const COLUMNAS: { titulo: string; tarjetas: string[] }[] = [
  { titulo: "Muestra solicitada", tarjetas: ["Club Pádel Norte", "Gym Centro"] },
  { titulo: "Muestra enviada", tarjetas: ["Box 21", "Estudio Pilates Sol"] },
  { titulo: "Seguimiento", tarjetas: ["CD Ribera"] },
  { titulo: "Pedido", tarjetas: ["Pádel Indoor Sur"] },
];

/** Portátil con el tablero del CRM. Los centros son de ejemplo y se dice. */
export function PortatilCrm() {
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="rounded-t-2xl border-[8px] border-b-0 p-3" style={{ borderColor: "#1c1f24", background: "#0F1114" }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: PD.suave }}>
            Tu CRM · Leads
          </p>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: "rgba(77,163,255,.15)", color: PD.acentoClaro }}>
            Ejemplo
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COLUMNAS.map((c, i) => (
            <div key={c.titulo} className="rounded-lg p-1.5" style={{ background: PD.superficie }}>
              <p className="mb-1.5 min-h-[2.4em] text-[9px] font-bold uppercase leading-tight tracking-[0.04em] sm:text-[10px]" style={{ color: i === 3 ? PD.acentoClaro : PD.suave }}>
                {c.titulo}
              </p>
              {c.tarjetas.map((t) => (
                <div key={t} className="mb-1.5 rounded-md p-1.5 text-[9px] font-semibold leading-tight sm:text-[11px]" style={{ background: "#1E2127", borderLeft: `3px solid ${i === 3 ? PD.acentoClaro : PD.acento}` }}>
                  {t}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="h-3 rounded-b-xl" style={{ background: "#2a2e35" }} />
      <div className="mx-auto h-1.5 w-1/3 rounded-b-lg" style={{ background: "#1c1f24" }} />
    </div>
  );
}
