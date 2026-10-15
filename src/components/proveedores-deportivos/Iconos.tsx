/**
 * Iconos lineales de trazo grueso, propios: sin librería para doce dibujos.
 * Heredan el color del texto (`currentColor`).
 */
const TRAZOS = {
  megafono: <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Zm12-3a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14" />,
  crm: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 4v16M13 4v16M3 9h18" />
    </>
  ),
  euro: <path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9" />,
  puerta: (
    <>
      <path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M3 21h16" />
      <path d="M13 12h.01M19 8l2 2-2 2" />
    </>
  ),
  feria: (
    <>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M9 21v-6h6v6M3 13h18" />
    </>
  ),
  telefono: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />,
  anuncio: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </>
  ),
  filtro: <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4Z" />,
  caja: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  apreton: <path d="m11 17 2 2a1 1 0 1 0 3-3m-2-2 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a2 2 0 0 0-2.8 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5 5 0 0 1 6.1-.7l.5.3a2 2 0 0 0 1.4.3L21 6m0-1v8h-2M3 4l-1 9 6.5 6.5a1 1 0 1 0 3-3M3 5h7" />,
  check: <path d="M4 12.5 9.5 18 20 6.5" />,
  flecha: <path d="M5 12h14m-6-6 6 6-6 6" />,
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, className = "h-6 w-6" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {TRAZOS[nombre]}
    </svg>
  );
}
