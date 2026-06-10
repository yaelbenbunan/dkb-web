import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Política de Privacidad — dinkbit",
  description:
    "Política de privacidad de dinkbit Marketing S.L. Información sobre el tratamiento de datos personales conforme al RGPD y la LOPDGDD.",
};

const UPDATED_AT = "2026-01-15";

export default function PrivacidadPage() {
  return (
    <LegalLayout
      eyebrow="Aviso de privacidad"
      title={
        <>
          Política de{" "}
          <span className="italic text-accent">privacidad</span>
        </>
      }
      updatedAt={UPDATED_AT}
    >
      <p>
        En <strong>Dinkbit Marketing S.L.</strong> (en adelante, &ldquo;dinkbit&rdquo;)
        nos tomamos muy en serio la privacidad y la protección de los datos
        personales de los usuarios. Esta política describe cómo recopilamos,
        tratamos y protegemos tu información cuando interactúas con nuestro
        sitio web o nuestros servicios.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          <strong>Identidad:</strong> Dinkbit Marketing S.L.
        </li>
        <li>
          <strong>NIF:</strong> B88317391
        </li>
        <li>
          <strong>Dirección:</strong> C/ Fuerteventura 4, Planta 3, Oficina 2,
          28703 San Sebastián de los Reyes, Madrid (España).
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:admin-es@dinkbit.com">admin-es@dinkbit.com</a>
        </li>
      </ul>

      <h2>2. Finalidad del tratamiento</h2>
      <p>
        En dinkbit tratamos los datos personales con las siguientes
        finalidades:
      </p>
      <ul>
        <li>
          Gestionar, estudiar y dar respuesta a las consultas realizadas a
          través del sitio web.
        </li>
        <li>
          Elaborar presupuestos y gestionar las solicitudes comerciales.
        </li>
        <li>Gestionar la relación contractual con los clientes.</li>
        <li>
          Envío de comunicaciones comerciales, newsletters y promociones, previo
          consentimiento.
        </li>
        <li>Realizar acciones de marketing, segmentación y remarketing.</li>
        <li>
          Analizar el comportamiento del usuario en la web para mejorar la
          experiencia y los servicios.
        </li>
      </ul>

      <h2>3. Legitimación</h2>
      <p>La base legal para el tratamiento de los datos es:</p>
      <ul>
        <li>El consentimiento del usuario al cumplimentar los formularios.</li>
        <li>La ejecución de un contrato o medidas precontractuales.</li>
        <li>
          El interés legítimo en el desarrollo de la actividad comercial y la
          mejora de los servicios.
        </li>
      </ul>

      <h2>4. Conservación de los datos</h2>
      <p>Los datos personales se conservarán durante los siguientes plazos:</p>
      <ul>
        <li>
          <strong>Leads y contactos:</strong> hasta 3 años desde el último
          contacto.
        </li>
        <li>
          <strong>Clientes:</strong> durante la relación contractual y,
          posteriormente, durante los plazos legales (mínimo 5 años).
        </li>
        <li>
          <strong>Comunicaciones comerciales:</strong> hasta que el usuario
          solicite su baja.
        </li>
      </ul>

      <h2>5. Destinatarios</h2>
      <p>
        Para la correcta prestación del servicio, dinkbit utiliza los siguientes
        proveedores como encargados del tratamiento:
      </p>
      <ul>
        <li>
          <strong>Hosting y deploy:</strong> Vercel Inc.
        </li>
        <li>
          <strong>Envío de emails transaccionales:</strong> Resend, Inc.
        </li>
        <li>
          <strong>Email marketing:</strong> Mailchimp.
        </li>
        <li>
          <strong>Analítica web:</strong> Google Analytics.
        </li>
        <li>
          <strong>Publicidad y remarketing:</strong> Meta (Facebook / Instagram
          Ads), Google Ads.
        </li>
      </ul>
      <p>
        Estos proveedores acceden a los datos únicamente para la prestación del
        servicio y bajo contratos que cumplen con la normativa del RGPD.
      </p>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunos de los proveedores mencionados implican transferencias
        internacionales de datos (por ejemplo, Google, Meta o Vercel). Estas
        transferencias se realizan con las garantías adecuadas previstas en el
        RGPD, incluidas las cláusulas contractuales tipo aprobadas por la
        Comisión Europea.
      </p>

      <h2>7. Derechos del usuario</h2>
      <p>El usuario podrá ejercer en cualquier momento los siguientes derechos:</p>
      <ul>
        <li>Acceso a sus datos personales.</li>
        <li>Rectificación de datos inexactos o incompletos.</li>
        <li>Supresión cuando ya no sean necesarios.</li>
        <li>Limitación del tratamiento.</li>
        <li>Portabilidad de los datos.</li>
        <li>Oposición al tratamiento.</li>
      </ul>
      <p>
        Para ejercer estos derechos, basta con enviar un correo a{" "}
        <a href="mailto:admin-es@dinkbit.com">admin-es@dinkbit.com</a> indicando
        el derecho que se desea ejercer y adjuntando una copia del documento
        identificativo.
      </p>
      <p>
        El usuario tiene derecho, igualmente, a presentar una reclamación ante
        la Agencia Española de Protección de Datos a través de su sede
        electrónica (
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
          www.aepd.es
        </a>
        ).
      </p>

      <h2>8. Seguridad de los datos</h2>
      <p>
        dinkbit aplica las medidas técnicas y organizativas necesarias para
        garantizar la seguridad, confidencialidad e integridad de los datos
        personales, evitando su alteración, pérdida o tratamiento no
        autorizado.
      </p>

      <h2>9. Comunicaciones comerciales</h2>
      <p>Sólo se enviarán comunicaciones comerciales cuando:</p>
      <ul>
        <li>El usuario haya prestado su consentimiento explícito.</li>
        <li>
          Exista una relación contractual previa, con la posibilidad de darse de
          baja en cualquier momento.
        </li>
      </ul>

      <h2>10. Cookies y tecnologías de seguimiento</h2>
      <p>Este sitio web utiliza cookies y tecnologías similares, incluyendo:</p>
      <ul>
        <li>Google Analytics.</li>
        <li>Meta Pixel.</li>
        <li>Cookies técnicas y de personalización.</li>
      </ul>
      <p>
        Para más información, consulta nuestra{" "}
        <a href="/cookies">Política de Cookies</a>.
      </p>

      <h2>11. Modificaciones</h2>
      <p>
        dinkbit se reserva el derecho a modificar esta política para adaptarla
        a cambios legislativos o a modificaciones en su actividad. Cualquier
        cambio se notificará a través del sitio web.
      </p>
    </LegalLayout>
  );
}
