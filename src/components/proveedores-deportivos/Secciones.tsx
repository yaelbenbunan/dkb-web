import Image from "next/image";
import { AlAparecer } from "@/app/(growth)/growth/_components/AlAparecer";
import { PD_FAQS_RESPONDIDAS, PD_PRECIO, PD_PRECIO_SUFIJO } from "@/lib/proveedores-deportivos";
import { Contador } from "./Contador";
import { CtaMovil } from "./CtaMovil";
import { Hero, TITULAR } from "./Hero";
import { Icono, type NombreIcono } from "./Iconos";
import { MovilAnuncio, PortatilCrm } from "./Mockups";
import { PD, TITULO } from "./tema";

function Bloque({ id, antetitulo, titulo, children }: { id?: string; antetitulo: string; titulo: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.14em]" style={{ color: PD.acentoClaro }}>
        {antetitulo}
      </p>
      <h2 className="mt-2 max-w-3xl text-[38px] uppercase leading-[0.95] sm:text-[52px]" style={TITULO}>
        {titulo}
      </h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function BotonCta({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#solicitud"
      className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl px-8 text-[17px] font-extrabold uppercase tracking-[0.04em] text-white transition-transform hover:-translate-y-0.5"
      style={{ background: PD.acento, boxShadow: "0 18px 40px -16px rgba(24,123,239,.8)" }}
    >
      {children}
      <Icono nombre="flecha" className="h-5 w-5" />
    </a>
  );
}

/** Tarjeta con foto a sangre y capa oscura; el texto va siempre sobre la capa. */
function TarjetaFoto({ foto, children, className = "" }: { foto: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`group relative isolate overflow-hidden rounded-2xl border transition-[border-color,box-shadow] duration-300 hover:border-[#187bef] hover:shadow-[0_0_0_4px_rgba(24,123,239,.25)] ${className}`} style={{ borderColor: PD.linea }}>
      <Image src={`/img/deporte/${foto}.webp`} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="-z-20 object-cover transition-transform duration-500 group-hover:scale-105" />
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgba(11,12,14,.55), rgba(11,12,14,.92))" }} />
      {children}
    </div>
  );
}

const PROBLEMAS: { foto: string; icono: NombreIcono; texto: string }[] = [
  { foto: "gimnasio", icono: "puerta", texto: "Los centros ya tienen proveedor y no te contestan" },
  { foto: "pista-padel", icono: "feria", texto: "Las ferias son caras y solo hay unas pocas al año" },
  { foto: "box-crossfit", icono: "telefono", texto: "Tu comercial pierde horas llamando en frío" },
];

const PASOS: { icono: NombreIcono; texto: string }[] = [
  { icono: "anuncio", texto: "Creamos anuncios con tu producto dirigidos a gimnasios y clubes." },
  { icono: "filtro", texto: "El centro pide su muestra gratis y nosotros filtramos que sea un negocio real." },
  { icono: "caja", texto: "Tú envías la muestra y sigues cada lead desde tu CRM." },
  { icono: "apreton", texto: "Haces el seguimiento y cierras el pedido recurrente." },
];

const PERFILES: { foto: string; titulo: string }[] = [
  { foto: "pista-padel", titulo: "Pádel" },
  { foto: "equipaciones", titulo: "Equipaciones" },
  { foto: "hero-toallas", titulo: "Merchandising" },
  { foto: "hero-magnesio", titulo: "Consumibles de gimnasio" },
  { foto: "suelo-gimnasio", titulo: "Suelos" },
  { foto: "trofeos", titulo: "Trofeos" },
];

const INCLUYE: string[] = [
  "Creación de la campaña en Meta Ads (anuncios, textos y segmentación a gimnasios y clubes)",
  "Formulario de solicitud de muestras con filtro de negocios reales",
  "Acceso al CRM para gestionar todos tus leads",
  "Pipeline visual de cada lead: Muestra solicitada → Muestra enviada → Seguimiento → Pedido",
];

/**
 * Cifras reales de la franja de contadores. Mientras alguna sea `null` la franja
 * no se pinta: un contador con `[X]` o con un número inventado resta.
 */
const CIFRAS: { valor: number | null; sufijo?: string; etiqueta: string }[] = [
  { valor: null, etiqueta: "muestras enviadas" },
  { valor: null, etiqueta: "centros contactados" },
  { valor: null, sufijo: "%", etiqueta: "de muestras que acaban en pedido" },
];

/** Testimonios reales. Vacío = la sección de casos no se pinta. */
const CASOS: { cliente: string; logo?: string; testimonio: string; resultado: string }[] = [];

export function LandingProveedoresDeportivos() {
  return (
    <>
      <Hero />

      {/* 2. Cifras: solo con datos reales. */}
      {CIFRAS.every((c) => c.valor !== null) && (
        <section className="border-y" style={{ borderColor: PD.linea, background: PD.superficie }}>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-6">
            {CIFRAS.map((c) => (
              <Contador key={c.etiqueta} valor={c.valor} sufijo={c.sufijo} etiqueta={c.etiqueta} />
            ))}
          </div>
        </section>
      )}

      {/* 3. El problema */}
      <Bloque antetitulo="El problema" titulo="Vender a centros deportivos es lento y caro">
        <div className="grid gap-4 md:grid-cols-3">
          {PROBLEMAS.map((p, i) => (
            <AlAparecer key={p.foto} retraso={i * 90}>
              <TarjetaFoto foto={p.foto} className="flex min-h-[260px] flex-col justify-end p-6">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: PD.acento }}>
                  <Icono nombre={p.icono} className="h-6 w-6 text-white" />
                </span>
                <p className="text-[22px] font-extrabold leading-tight">{p.texto}</p>
              </TarjetaFoto>
            </AlAparecer>
          ))}
        </div>
      </Bloque>

      {/* 4. Cómo funciona */}
      <Bloque antetitulo="Cómo funciona" titulo="De anuncio a pedido recurrente en 4 pasos">
        <ol className="relative grid gap-8 md:grid-cols-4 md:gap-5">
          <span aria-hidden className="absolute bottom-6 left-7 top-6 w-0.5 md:hidden" style={{ background: PD.linea }} />
          {PASOS.map((p, i) => (
            <AlAparecer key={p.icono} retraso={i * 90}>
              <li className="relative flex gap-5 md:block">
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2" style={{ borderColor: PD.acento, background: PD.bg, color: PD.acentoClaro }}>
                  <Icono nombre={p.icono} className="h-7 w-7" />
                </span>
                <div className="md:mt-5">
                  <p className="text-[40px] leading-none" style={{ ...TITULO, color: PD.acentoClaro }}>
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 text-[17px] font-semibold leading-snug">{p.texto}</p>
                </div>
              </li>
            </AlAparecer>
          ))}
        </ol>
      </Bloque>

      {/* 5. Para quién es */}
      <Bloque antetitulo="Para quién es" titulo="Proveedores que venden a centros deportivos">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {PERFILES.map((p, i) => (
            <AlAparecer key={p.titulo} retraso={i * 70}>
              <TarjetaFoto foto={p.foto} className="flex aspect-[4/5] items-end p-4 sm:aspect-[4/3] sm:p-6">
                <p className="text-[24px] uppercase leading-none sm:text-[32px]" style={TITULO}>
                  {p.titulo}
                </p>
              </TarjetaFoto>
            </AlAparecer>
          ))}
        </div>
      </Bloque>

      {/* 6. Ejemplo de anuncio */}
      <Bloque antetitulo="Ejemplo de anuncio" titulo="Así verán tu anuncio los centros deportivos">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <MovilAnuncio />
          <div className="space-y-4 text-[17px] leading-relaxed" style={{ color: PD.suave }}>
            <p>
              Un anuncio con <strong style={{ color: PD.texto }}>tu producto</strong>, dirigido solo a gimnasios, clubes de pádel, boxes y estudios.
            </p>
            <p>
              El centro pide su muestra en un formulario que <strong style={{ color: PD.texto }}>filtra que sea un negocio real</strong> antes de que envíes nada.
            </p>
            <p>Cada solicitud entra en tu CRM para que la sigas hasta el pedido.</p>
          </div>
        </div>
      </Bloque>

      {/* 7. Casos: solo con testimonios reales. */}
      {CASOS.length > 0 && (
        <Bloque antetitulo="Casos" titulo="Proveedores que ya venden así">
          <div className="grid gap-4 md:grid-cols-3">
            {CASOS.map((c) => (
              <div key={c.cliente} className="rounded-2xl border p-6" style={{ borderColor: PD.linea, background: PD.superficie }}>
                <div className="flex h-12 items-center">
                  {c.logo ? <Image src={c.logo} alt={c.cliente} width={140} height={48} className="h-12 w-auto object-contain" /> : <p className="text-[18px] font-extrabold">{c.cliente}</p>}
                </div>
                <p className="mt-4 text-[16px] leading-relaxed">{c.testimonio}</p>
                <p className="mt-4 text-[15px] font-bold" style={{ color: PD.acentoClaro }}>
                  {c.resultado}
                </p>
              </div>
            ))}
          </div>
        </Bloque>
      )}

      {/* 8. Precio */}
      <Bloque id="precio" antetitulo="Precio" titulo="Pack Campaña + CRM">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="rounded-3xl border-2 p-6 sm:p-8" style={{ borderColor: PD.acento, background: PD.superficie, boxShadow: "0 0 0 6px rgba(24,123,239,.12), 0 40px 100px -40px rgba(24,123,239,.7)" }}>
            <p className="text-[14px] font-extrabold uppercase tracking-[0.1em]" style={{ color: PD.acentoClaro }}>
              Pack Campaña + CRM
            </p>
            <p className="mt-2 flex items-end gap-2">
              <span className="text-[88px] leading-none sm:text-[104px]" style={TITULO}>
                {PD_PRECIO}
              </span>
              <span className="mb-3 text-[18px] font-bold" style={{ color: PD.suave }}>
                {PD_PRECIO_SUFIJO}
              </span>
            </p>
            <ul className="mt-6 space-y-3">
              {INCLUYE.map((linea, i) => (
                <li key={i} className="flex gap-3 text-[16px] leading-snug">
                  <Icono nombre="check" className="mt-0.5 h-5 w-5 shrink-0 text-[#4DA3FF]" />
                  <span>{linea}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl p-3 text-[14px] leading-relaxed" style={{ background: "rgba(255,255,255,.04)", color: PD.suave }}>
              La inversión publicitaria en Meta no está incluida: se paga aparte, directamente a Meta.
            </p>
            <div className="mt-6">
              <BotonCta>Empezar ahora</BotonCta>
            </div>
          </div>
          <PortatilCrm />
        </div>
      </Bloque>

      {/* 9. FAQ */}
      <Bloque antetitulo="Preguntas frecuentes" titulo="Lo que nos suelen preguntar">
        <div className="mx-auto max-w-3xl divide-y" style={{ borderColor: PD.linea }}>
          {PD_FAQS_RESPONDIDAS.map((f) => (
            <details key={f.q} className="group py-4" style={{ borderColor: PD.linea }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-bold">
                {f.q}
                <span className="text-[24px] transition-transform group-open:rotate-45" style={{ color: PD.acentoClaro }}>
                  +
                </span>
              </summary>
              <p className="mt-3 text-[16px] leading-relaxed" style={{ color: PD.suave }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </Bloque>

      {/* 10. CTA final */}
      <section id="cta-final" className="px-4 py-20 text-center sm:px-6" style={{ background: `radial-gradient(ellipse at center, rgba(24,123,239,.25), transparent 70%)` }}>
        <p className="text-[13px] font-extrabold uppercase tracking-[0.14em]" style={{ color: PD.acentoClaro }}>
          Pack Campaña + CRM · {PD_PRECIO} {PD_PRECIO_SUFIJO}
        </p>
        <h2 className="mx-auto mt-2 max-w-4xl text-[40px] uppercase leading-[0.95] sm:text-[60px]" style={TITULO}>
          {TITULAR}
        </h2>
        <div className="mt-8">
          <BotonCta>Quiero mi pack</BotonCta>
        </div>
      </section>

      {/* Hueco para que el botón fijo del móvil no tape el pie. */}
      <div aria-hidden className="h-20 md:hidden" />
      <CtaMovil />
    </>
  );
}
