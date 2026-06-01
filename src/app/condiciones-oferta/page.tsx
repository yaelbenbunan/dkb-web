import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Condiciones de la oferta — dinkbit",
  description:
    "Condiciones de la oferta de desarrollo web de dinkbit: web de hasta 5 secciones con 50% de descuento durante 48 horas.",
};

const UPDATED_AT = "2026-06-01";

export default function CondicionesOfertaPage() {
  return (
    <LegalLayout
      eyebrow="Promoción"
      title={
        <>
          Condiciones de la <span className="italic text-accent">oferta</span>
        </>
      }
      updatedAt={UPDATED_AT}
    >
      <p>
        Las presentes condiciones regulan la promoción de desarrollo web ofrecida
        por Dinkbit Marketing S.L. a través del previsualizador de
        <a href="/imagina-tu-web"> «Imagina tu web»</a>. Esta página podrá
        actualizarse; prevalece siempre la versión publicada en el momento de la
        contratación.
      </p>

      <h2>1. En qué consiste la oferta</h2>
      <ul>
        <li>
          Diseño y desarrollo de una <strong>web de hasta 5 secciones</strong>{" "}
          (p. ej. inicio, servicios, sobre nosotros, contacto y una adicional)
          partiendo de una plantilla adaptada a tu marca.
        </li>
        <li>
          <strong>Precio promocional: 1.000&nbsp;€</strong> (IVA no incluido),
          frente al precio de referencia sin promoción de 2.000&nbsp;€.
        </li>
        <li>Incluye una (1) ronda de revisiones sobre la propuesta entregada.</li>
        <li>Puesta en marcha y publicación de la web.</li>
      </ul>

      <h2>2. Qué NO incluye</h2>
      <ul>
        <li>
          <strong>La generación de contenidos.</strong> Los textos definitivos y
          las imágenes/fotografías/vídeos los aporta el cliente. dinkbit puede
          maquetar y ordenar el contenido recibido, pero la creación,
          redacción profesional, sesiones de fotografía, banco de imágenes de
          pago o producción audiovisual no están incluidos en el precio
          promocional y se presupuestan aparte si se solicitan.
        </li>
        <li>
          Secciones adicionales por encima de 5, funcionalidades a medida
          (tienda online, reservas, áreas privadas, integraciones, etc.).
        </li>
        <li>
          Dominio, hosting, correo corporativo, licencias de terceros y
          mantenimiento posterior, salvo que se acuerden por separado.
        </li>
        <li>Redacción legal a medida, traducciones y SEO avanzado.</li>
      </ul>

      <h2>3. Validez y activación</h2>
      <ul>
        <li>
          La promoción es válida durante <strong>48 horas</strong> desde el
          envío del correo con la oferta. Pasado ese plazo, aplica el precio de
          referencia.
        </li>
        <li>
          Para activarla es necesario aceptar la propuesta dentro del plazo y
          completar un briefing inicial.
        </li>
        <li>
          No acumulable con otras ofertas, descuentos o promociones vigentes.
        </li>
        <li>Limitada a un (1) proyecto por cliente.</li>
      </ul>

      <h2>4. Plazos y colaboración</h2>
      <p>
        Los plazos de entrega se acuerdan en el briefing y dependen de que el
        cliente facilite a tiempo los contenidos, accesos y validaciones
        necesarios. La falta de entrega de materiales por parte del cliente
        puede suspender o ampliar los plazos.
      </p>

      <h2>5. Sobre el preview</h2>
      <p>
        La previsualización generada y el PDF adjunto al correo son una{" "}
        <strong>simulación orientativa</strong> creada automáticamente a partir
        de tus respuestas. No representan el diseño, los textos, las imágenes ni
        la estructura finales, que se definen durante el proyecto.
      </p>

      <h2>6. Modificación o cancelación</h2>
      <p>
        Dinkbit Marketing S.L. podrá verificar la elegibilidad de cada solicitud
        y modificar, suspender o cancelar la promoción en cualquier momento por
        causas justificadas, sin que ello afecte a los proyectos ya contratados.
      </p>

      <h2>7. Responsable y contacto</h2>
      <p>
        Responsable: <strong>Dinkbit Marketing S.L.</strong> Para cualquier duda
        sobre la promoción puedes escribir a{" "}
        <a href="mailto:hola@dinkbit.es">hola@dinkbit.es</a>. Consulta también el{" "}
        <a href="/aviso-legal">Aviso Legal</a> y la{" "}
        <a href="/privacidad">Política de Privacidad</a>.
      </p>
    </LegalLayout>
  );
}
