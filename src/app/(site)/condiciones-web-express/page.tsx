import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import {
  WEB_EXPRESS_PRICE,
  WEB_EXPRESS_DAYS,
  WEB_EXPRESS_REVISION_RATE,
  WEB_EXPRESS_MATERIAL_DAYS,
} from "@/lib/web-express-landings";
import { CONTACT_INFO } from "@/lib/contact-info";

export const metadata: Metadata = {
  title: "Condiciones del servicio de web en una semana — dinkbit",
  description: `Condiciones del servicio de diseño web por ${WEB_EXPRESS_PRICE}: alcance, plazos, revisiones, pago y responsabilidades.`,
  alternates: { canonical: "/condiciones-web-express" },
};

const UPDATED_AT = "2026-08-12";

/**
 * Condiciones del producto de web cerrada que venden las landings por nicho.
 *
 * No es un documento de relleno: cada cláusula tapa una vía concreta por la que
 * un proyecto de este precio deja de ser rentable. A 459€ el margen se lo come
 * el alcance que se da por supuesto, las revisiones sin límite y el tiempo
 * persiguiendo textos y fotos, así que eso es lo que se acota aquí.
 */
export default function CondicionesWebExpressPage() {
  return (
    <LegalLayout
      eyebrow="Servicio"
      title={
        <>
          Condiciones de la <span className="italic text-accent">web en una semana</span>
        </>
      }
      updatedAt={UPDATED_AT}
    >
      <p>
        Estas condiciones regulan el servicio de diseño y desarrollo web de precio
        cerrado que dinkbit Marketing S.L. (CIF B88317391) ofrece a través de sus
        páginas de <a href="/web-para-psicologos">psicología</a>,{" "}
        <a href="/web-para-fisioterapeutas">fisioterapia</a> y{" "}
        <a href="/web-para-clinicas-esteticas">clínicas estéticas</a>. Podrán
        actualizarse; prevalece siempre la versión publicada en el momento de la
        contratación.
      </p>

      <h2>1. Qué se contrata</h2>
      <p>
        Una página web de una sola página («one page») con un máximo de{" "}
        <strong>seis secciones</strong>, diseñada a partir de la información que
        el cliente facilita en el cuestionario. El servicio incluye:
      </p>
      <ul>
        <li>Diseño y maquetación de la página, adaptada a móvil, tablet y ordenador.</li>
        <li>Formulario de contacto cuyos envíos llegan al correo que indique el cliente.</li>
        <li>Botón de WhatsApp y de llamada.</li>
        <li>Textos legales básicos: aviso legal, política de privacidad y política de cookies.</li>
        <li>Una ronda de cambios sobre la primera versión entregada.</li>
        <li>Publicación en el dominio y alojamiento que el cliente aporte.</li>
      </ul>

      <h2>2. Qué no está incluido</h2>
      <p>
        Lo siguiente queda expresamente fuera del precio cerrado. Puede
        contratarse aparte, con presupuesto previo:
      </p>
      <ul>
        <li>Agenda o sistema de reserva de cita online.</li>
        <li>Área privada de usuarios, pacientes o historia clínica.</li>
        <li>Venta de productos, bonos, packs o sesiones desde la web.</li>
        <li>Integración con software de gestión, agendas externas o CRM.</li>
        <li>Blog o cualquier sistema de publicación de contenidos.</li>
        <li>Versión en más de un idioma.</li>
        <li>Redacción de textos, fotografía, vídeo o diseño de logotipo.</li>
        <li>Posicionamiento en buscadores (SEO), campañas de publicidad y analítica avanzada.</li>
        <li>Mantenimiento, copias de seguridad y actualizaciones posteriores a la entrega.</li>
        <li>Dominio y alojamiento.</li>
      </ul>

      <h2>3. Precio y pago</h2>
      <p>
        El precio es de <strong>{WEB_EXPRESS_PRICE}</strong>, IVA no incluido, y
        es cerrado: no hay cuotas mensuales ni cargos posteriores por el alcance
        descrito en el apartado 1.
      </p>
      <p>
        El pago se realiza <strong>íntegramente por adelantado</strong>, antes del
        inicio del trabajo. El proyecto no se planifica hasta que el pago consta
        recibido.
      </p>
      <p>
        El <strong>dominio y el alojamiento no están incluidos</strong> y se
        contratan a nombre del cliente, que es su titular. Su coste orientativo
        es de unos 100€ anuales y lo abona directamente al proveedor. dinkbit
        puede asesorar en la contratación, pero no la gestiona ni responde de
        ella.
      </p>

      <h2>4. Plazo de entrega</h2>
      <p>
        El plazo es de <strong>{WEB_EXPRESS_DAYS} días laborables</strong> y
        empieza a contar cuando dinkbit ha recibido{" "}
        <strong>la totalidad del material</strong>: el cuestionario completo, los
        textos definitivos, las imágenes y los accesos necesarios. No empieza a
        contar desde el pago.
      </p>
      <p>
        Este punto no es una formalidad: es la única forma de sostener el plazo y
        el precio. Si el material llega incompleto o por partes, el plazo queda en
        suspenso y se reanuda cuando esté todo.
      </p>
      <p>
        Si transcurren <strong>{WEB_EXPRESS_MATERIAL_DAYS} días naturales</strong>{" "}
        desde la contratación sin que el material esté completo, el proyecto pasa
        a estado pausado. Puede retomarse en cualquier momento dentro de los seis
        meses siguientes, sujeto a la disponibilidad de agenda del momento.
      </p>

      <h2>5. Revisiones y cambios</h2>
      <p>
        El precio incluye <strong>una ronda de cambios</strong> sobre la primera
        versión entregada. Se entiende por ronda de cambios un único conjunto de
        correcciones comunicado de una vez: textos, colores, orden de secciones o
        sustitución de imágenes.
      </p>
      <p>
        Las peticiones posteriores, así como los cambios que alteren la estructura
        acordada o añadan secciones por encima de seis, se presupuestan aparte a
        razón de <strong>{WEB_EXPRESS_REVISION_RATE}</strong> (IVA no incluido),
        siempre con aprobación previa del cliente.
      </p>
      <p>
        Transcurridos <strong>15 días naturales</strong> desde la entrega de la
        primera versión sin que el cliente comunique cambios, el proyecto se
        considera aceptado y la ronda incluida, consumida.
      </p>

      <h2>6. Contenidos y responsabilidad del cliente</h2>
      <p>
        Los textos, imágenes, logotipos y cualquier otro material los aporta el
        cliente, que declara disponer de los derechos necesarios para su uso y
        responde frente a reclamaciones de terceros por este motivo.
      </p>
      <p>
        El cliente es el <strong>único responsable de la veracidad y la legalidad
        de los contenidos</strong> que publique, en particular de los relativos a
        titulaciones, colegiación, tratamientos, resultados y precios.
      </p>
      <p>
        En los sectores sanitario y de estética, la publicidad está sujeta a
        normativa específica: no pueden garantizarse resultados, ni utilizarse
        testimonios o imágenes de antes y después que induzcan a error, y deben
        constar los datos identificativos del centro y de sus profesionales.
        dinkbit puede advertir de estos aspectos, pero no realiza validación
        jurídica de los contenidos ni asume responsabilidad por ellos.
      </p>

      <h2>7. Propiedad y uso como referencia</h2>
      <p>
        Una vez abonado el precio, el cliente es titular de los contenidos y del
        resultado final, y puede modificarlo o migrarlo libremente.
      </p>
      <p>
        Salvo indicación en contra del cliente, dinkbit podrá mostrar el trabajo
        en su porfolio y en sus canales como referencia comercial.
      </p>

      <h2>8. Cancelación</h2>
      <p>
        El servicio se presta a profesionales y empresas en el marco de su
        actividad, por lo que no resulta de aplicación el derecho de desistimiento
        previsto para consumidores.
      </p>
      <p>
        Si el cliente cancela antes de que se haya entregado la primera versión,
        se reembolsa el importe abonado menos el trabajo ya realizado. Una vez
        entregada la primera versión, no procede reembolso.
      </p>

      <h2>9. Protección de datos</h2>
      <p>
        Los datos facilitados se tratan conforme a nuestra{" "}
        <a href="/privacidad">política de privacidad</a>. Cuando la prestación del
        servicio implique acceso a datos personales de los que el cliente sea
        responsable, se formalizará el correspondiente contrato de encargo de
        tratamiento.
      </p>

      <h2>10. Legislación y jurisdicción</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Para cualquier
        controversia, las partes se someten a los juzgados y tribunales de Madrid,
        salvo que la normativa aplicable disponga otro fuero.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para cualquier duda sobre estas condiciones:{" "}
        <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>.
      </p>
    </LegalLayout>
  );
}
