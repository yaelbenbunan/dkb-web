import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Aviso Legal — dinkbit",
  description:
    "Aviso legal de dinkbit Marketing S.L. en cumplimiento de la LSSICE.",
};

const UPDATED_AT = "2026-01-15";

export default function AvisoLegalPage() {
  return (
    <LegalLayout
      eyebrow="Información legal"
      title={
        <>
          Aviso{" "}
          <span className="italic text-accent">legal</span>
        </>
      }
      updatedAt={UPDATED_AT}
    >
      <h2>1. Datos identificativos</h2>
      <p>
        En cumplimiento del deber de información recogido en el artículo 10 de
        la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
        Información y de Comercio Electrónico (LSSICE), se informa de los
        siguientes datos:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> Dinkbit Marketing S.L.
        </li>
        <li>
          <strong>NIF:</strong> B88317391
        </li>
        <li>
          <strong>Domicilio:</strong> C/ Fuerteventura 4, Planta 3, Oficina 2,
          28703 San Sebastián de los Reyes, Madrid (España).
        </li>
        <li>
          <strong>Correo electrónico:</strong>{" "}
          <a href="mailto:admin-es@dinkbit.com">admin-es@dinkbit.com</a>
        </li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        El presente Aviso Legal regula el acceso, navegación y uso del sitio
        web titularidad de Dinkbit Marketing S.L. El acceso al sitio web implica
        la aceptación expresa y sin reservas de todos los términos del presente
        Aviso Legal, así como de la{" "}
        <a href="/privacidad">Política de Privacidad</a> y de la{" "}
        <a href="/cookies">Política de Cookies</a>.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El usuario se compromete a utilizar la web, sus contenidos y servicios
        conforme a:
      </p>
      <ul>
        <li>La legislación vigente.</li>
        <li>La buena fe.</li>
        <li>El orden público.</li>
      </ul>
      <p>
        Queda prohibido el uso del sitio web con fines ilícitos o lesivos, o
        que puedan causar perjuicio al titular o a terceros.
      </p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        Todos los contenidos del sitio web (textos, imágenes, diseño, código,
        marcas, logotipos, etc.) son propiedad de Dinkbit Marketing S.L. o
        cuentan con licencia para su uso. Queda prohibida su reproducción,
        distribución o modificación sin autorización expresa del titular.
      </p>

      <h2>5. Responsabilidad</h2>
      <p>Dinkbit Marketing S.L. no se hace responsable de:</p>
      <ul>
        <li>Los daños derivados del uso indebido de la web.</li>
        <li>La falta de disponibilidad o continuidad del sitio.</li>
        <li>La existencia de virus o elementos dañinos.</li>
      </ul>

      <h2>6. Enlaces (links)</h2>
      <p>En caso de que en el sitio web se dispongan enlaces a páginas de terceros:</p>
      <ul>
        <li>
          Dinkbit Marketing S.L. no se responsabiliza de los contenidos ni del
          funcionamiento de dichos sitios.
        </li>
        <li>La inclusión de enlaces no implica relación o aprobación alguna.</li>
      </ul>

      <h2>7. Protección de datos</h2>
      <p>
        Dinkbit Marketing S.L. cumple con la normativa vigente en materia de
        protección de datos. Puede consultar toda la información en nuestra{" "}
        <a href="/privacidad">Política de Privacidad</a>.
      </p>

      <h2>8. Uso de cookies</h2>
      <p>
        Este sitio web utiliza cookies propias y de terceros para mejorar la
        experiencia del usuario. Puede consultar más información en nuestra{" "}
        <a href="/cookies">Política de Cookies</a>.
      </p>

      <h2>9. Legislación aplicable y jurisdicción</h2>
      <p>
        La relación entre el usuario y Dinkbit Marketing S.L. se regirá por la
        normativa española vigente. Para la resolución de cualquier conflicto,
        las partes se someterán a los juzgados y tribunales de Madrid, salvo
        que la normativa aplicable disponga otra cosa.
      </p>
    </LegalLayout>
  );
}
