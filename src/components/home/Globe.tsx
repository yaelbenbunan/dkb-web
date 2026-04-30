/**
 * Globo terráqueo wireframe abstracto. Decorativo, sin contenido geográfico real
 * (meridianos + paralelos). Pensado para fondo de la sección About+Features.
 */
export function Globe({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <defs>
        <radialGradient id="globe-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#187bef" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#187bef" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#187bef" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="globe-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3a90f2" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#187bef" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Glow detrás del globo */}
      <circle cx="200" cy="200" r="190" fill="url(#globe-glow)" />

      <g
        fill="none"
        stroke="url(#globe-stroke)"
        strokeWidth="0.9"
        opacity="0.85"
      >
        {/* Esfera externa */}
        <circle cx="200" cy="200" r="160" />

        {/* Paralelos (líneas horizontales = elipses con rx amplio, ry estrecho) */}
        <ellipse cx="200" cy="200" rx="160" ry="40" />
        <ellipse cx="200" cy="200" rx="160" ry="80" />
        <ellipse cx="200" cy="200" rx="160" ry="120" />

        {/* Meridianos (líneas verticales = elipses rotadas) */}
        <ellipse cx="200" cy="200" rx="40" ry="160" />
        <ellipse cx="200" cy="200" rx="80" ry="160" />
        <ellipse cx="200" cy="200" rx="120" ry="160" />

        {/* Eje vertical y horizontal centrales */}
        <line x1="40" y1="200" x2="360" y2="200" />
        <line x1="200" y1="40" x2="200" y2="360" />
      </g>

      {/* Puntos decorativos en intersecciones (representan "ubicaciones") */}
      <g fill="#187bef">
        <circle cx="280" cy="130" r="3" />
        <circle cx="140" cy="240" r="3" />
        <circle cx="260" cy="270" r="3" />
        <circle cx="170" cy="150" r="2.5" />
      </g>
    </svg>
  );
}
