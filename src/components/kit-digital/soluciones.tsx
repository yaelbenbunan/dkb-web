/**
 * Soluciones que cubre el bono del Kit Digital. Fuente única para la landing
 * de la convocatoria (/kit-digital-2026) y el bloque de la home, que antes
 * mantenían dos copias del mismo texto e iconos.
 */

export interface KitSolucion {
  title: string;
  description: string;
  /** Trazo del icono, pensado para un <svg viewBox="0 0 14 14">. */
  icon: React.ReactNode;
}

export const KIT_SOLUCIONES: KitSolucion[] = [
  {
    title: "Página web",
    description:
      "Tu web profesional o tienda online, lista para captar clientes.",
    icon: (
      <path d="M2 5h10M2 5a1 1 0 011-1h8a1 1 0 011 1M2 5v4a1 1 0 001 1h8a1 1 0 001-1V5M5.5 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "SEO / posicionamiento",
    description: "Aparece en Google cuando tus clientes te buscan.",
    icon: (
      <path d="M6.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Redes sociales",
    description: "Gestión de tus perfiles para conectar con tu audiencia.",
    icon: (
      <path d="M5 7a2 2 0 100-4 2 2 0 000 4zM10 12a2 2 0 100-4 2 2 0 000 4zM10 4a2 2 0 100-.01M6.7 6.3l2.6 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Puesto de trabajo",
    description: "Renueva tu ordenador y trabaja con equipos a la altura.",
    icon: (
      <path d="M2.5 3.5h9v6h-9v-6zM4 11.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

/** Icono de una solución, con el envoltorio <svg> ya aplicado. */
export function KitSolucionIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 14 14" fill="none" aria-hidden>
      {icon}
    </svg>
  );
}
