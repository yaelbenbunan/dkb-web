import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { CookieSettingsButton } from "@/components/legal/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Política de Cookies — dinkbit",
  description:
    "Política de cookies de dinkbit. Información sobre las cookies que utilizamos y cómo gestionar tus preferencias.",
};

const UPDATED_AT = "2026-01-15";

export default function CookiesPage() {
  return (
    <LegalLayout
      eyebrow="Aviso de cookies"
      title={
        <>
          Política de{" "}
          <span className="italic text-accent">cookies</span>
        </>
      }
      updatedAt={UPDATED_AT}
    >
      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que los sitios web instalan
        en el navegador del usuario y permiten almacenar y recuperar
        información sobre la navegación. Las cookies pueden ser propias (las
        gestiona el propio sitio) o de terceros (las gestionan terceros como
        Google o Meta).
      </p>

      <h2>2. ¿Quién es el responsable?</h2>
      <p>
        El responsable de las cookies utilizadas en este sitio web es{" "}
        <strong>Dinkbit Marketing S.L.</strong>, con NIF B88317391 y domicilio
        en C/ Fuerteventura 4, Planta 3, Oficina 2, 28703 San Sebastián de los
        Reyes, Madrid. Puedes contactar a través de{" "}
        <a href="mailto:admin-es@dinkbit.com">admin-es@dinkbit.com</a>.
      </p>

      <h2>3. Tipos de cookies que utilizamos</h2>
      <p>
        En cumplimiento del artículo 22.2 de la Ley de Servicios de la Sociedad
        de la Información (LSSI) y del Reglamento General de Protección de
        Datos (RGPD), agrupamos las cookies en las siguientes categorías:
      </p>

      <h3>3.1. Cookies técnicas o necesarias</h3>
      <p>
        Son imprescindibles para el funcionamiento del sitio web. Permiten,
        entre otras cosas, la navegación, recordar tus preferencias de
        consentimiento de cookies o la configuración del tema (claro/oscuro).{" "}
        <strong>No requieren consentimiento</strong> y no pueden desactivarse.
      </p>

      <h3>3.2. Cookies de análisis o medición</h3>
      <p>
        Permiten contar el número de visitantes y analizar cómo navegan los
        usuarios por el sitio para mejorar la experiencia. Sólo se activan
        cuando el usuario presta su consentimiento explícito. Utilizamos:
      </p>
      <ul>
        <li>
          <strong>Google Analytics 4</strong> (Google Ireland Limited).
          Finalidad: medición y estadística de uso del sitio. Más información en{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            policies.google.com/privacy
          </a>
          .
        </li>
      </ul>

      <h3>3.3. Cookies de marketing y publicidad</h3>
      <p>
        Permiten mostrarte publicidad personalizada en función de tu navegación
        y medir la eficacia de nuestras campañas. Sólo se activan con tu
        consentimiento explícito. Utilizamos:
      </p>
      <ul>
        <li>
          <strong>Meta Pixel</strong> (Meta Platforms Ireland Limited).
          Finalidad: medición y remarketing en Facebook e Instagram. Más
          información en{" "}
          <a
            href="https://www.facebook.com/privacy/policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            facebook.com/privacy/policy
          </a>
          .
        </li>
        <li>
          <strong>Google Ads</strong> (Google Ireland Limited). Finalidad:
          remarketing y medición de conversiones en la red de Google.
        </li>
      </ul>

      <h2>4. Consentimiento del usuario</h2>
      <p>
        Cuando visitas por primera vez nuestro sitio web, te mostramos un
        banner desde el que puedes:
      </p>
      <ul>
        <li>
          <strong>Aceptar todas:</strong> permitirás todas las categorías
          (técnicas, análisis y marketing).
        </li>
        <li>
          <strong>Rechazar todas:</strong> solo se instalarán las cookies
          técnicas estrictamente necesarias.
        </li>
        <li>
          <strong>Configurar:</strong> elige caso por caso qué categorías
          deseas permitir.
        </li>
      </ul>
      <p>
        Tu elección se guarda durante 12 meses, tras los cuales se te volverá a
        solicitar. Puedes cambiarla en cualquier momento desde aquí:
      </p>
      <CookieSettingsButton />

      <h2>5. ¿Cómo desactivar o eliminar cookies?</h2>
      <p>
        Además de gestionar tus preferencias desde nuestro panel, puedes
        controlar las cookies desde la configuración de tu navegador. Aquí
        tienes las guías oficiales:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunas cookies de terceros (Google, Meta) implican transferencias de
        datos fuera del Espacio Económico Europeo. Estas transferencias se
        realizan con las garantías adecuadas previstas en el RGPD.
      </p>

      <h2>7. Modificaciones</h2>
      <p>
        dinkbit puede modificar esta Política de Cookies en función de
        novedades legislativas, regulatorias o por cambios en las cookies
        utilizadas. Cuando se produzcan cambios significativos, se notificará
        a través del sitio web y, en su caso, se solicitará un nuevo
        consentimiento.
      </p>
    </LegalLayout>
  );
}
