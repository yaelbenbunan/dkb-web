import Image from "next/image";
import { GROWTH } from "@/lib/growth-config";

/**
 * El logotipo de Growth, el definitivo (25 de septiembre de 2026).
 *
 * Es la versión para fondo oscuro: marca turquesa y «growth» en blanco. La de
 * fondo claro (`growth-logo-claro.png`, en gris y negro) es la de los correos.
 * Los originales están en el repo `growth`, carpeta `logos-growth/`; estos son
 * los mismos recortados al borde y a 640 px de ancho.
 *
 * `priority` porque es lo primero que se ve de la página.
 */
export function Logotipo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/img/growth/growth-logo-oscuro.png"
      alt={`${GROWTH.name} by dinkbit`}
      width={640}
      height={173}
      priority
      className={`h-10 w-auto sm:h-11 ${className}`}
    />
  );
}
