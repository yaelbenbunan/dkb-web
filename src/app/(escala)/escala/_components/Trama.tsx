import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Textura de fondo, para que la página no sean cinco rectángulos negros.
 *
 * Dos motivos con puntos y rayas y ninguno se dibuja entero: los dos van
 * enmascarados con un degradado, así que aparecen por el centro y se disuelven
 * antes de llegar a los bordes. Una trama uniforme de lado a lado se lee como
 * el fondo de una plantilla; una que se desvanece se lee como luz.
 *
 * Las opacidades son bajas a conciencia (0,10 y 0,05 sobre un fondo casi
 * negro). Si se ven al primer vistazo, están mal: esto tiene que notarse
 * cuando el ojo descansa, no competir con el titular.
 */
export function Trama({
  motivo = "puntos",
  desde = "50% 45%",
  className = "",
}: {
  motivo?: "puntos" | "rayas";
  /** Dónde está el centro de la máscara, en sintaxis de position. */
  desde?: string;
  className?: string;
}) {
  const mascara = `radial-gradient(ellipse 85% 75% at ${desde}, black 15%, transparent 78%)`;

  const fondo =
    motivo === "puntos"
      ? {
          backgroundImage: `radial-gradient(rgba(245,247,248,0.10) 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
        }
      : {
          // Rayas a 45°, muy separadas: de cerca son líneas, de lejos es un
          // tejido. El truco es que el hueco sea diez veces la raya.
          backgroundImage: `repeating-linear-gradient(45deg, ${T.lime}0d 0 1px, transparent 1px 14px)`,
        };

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ ...fondo, maskImage: mascara, WebkitMaskImage: mascara }}
    />
  );
}
