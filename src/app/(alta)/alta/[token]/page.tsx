import type { Metadata } from "next";
import { CONTACT_INFO } from "@/lib/contact-info";
import { getAltaPorToken } from "@/lib/altas/db";
import { FormularioAlta, type ArchivoInicial } from "./FormularioAlta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alta de cliente",
  robots: { index: false, follow: false },
  // El token va en la URL: que no viaje en el Referer a otras webs.
  referrer: "no-referrer",
};

function EnlaceNoValido() {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Este enlace no es válido</h1>
      <p className="mt-4 text-lg text-slate-700">
        Si crees que es un error, escríbenos a{" "}
        <a href={`mailto:${CONTACT_INFO.email}`} className="font-semibold text-[#0b3ae7] underline underline-offset-4">
          {CONTACT_INFO.email}
        </a>{" "}
        y te mandamos uno nuevo.
      </p>
    </section>
  );
}

export default async function AltaClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const alta = await getAltaPorToken(token);
  // Inexistente y desactivado se ven igual: no se dice por qué.
  if (!alta || !alta.activa) return <EnlaceNoValido />;

  const archivos: ArchivoInicial[] = alta.archivos.map(({ campo, ruta, nombre, tamano }) => ({ campo, ruta, nombre, tamano }));
  return (
    <FormularioAlta
      token={token}
      cliente={alta.cliente}
      respuestas={alta.respuestas}
      archivos={archivos}
      enviadaEn={alta.enviada_en}
    />
  );
}
