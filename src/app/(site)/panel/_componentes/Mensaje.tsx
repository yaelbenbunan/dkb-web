import type { ResultadoAccion } from "@/lib/panel-resultado";

export function Mensaje({ resultado }: { resultado: ResultadoAccion | null }) {
  if (!resultado) return null;
  const texto = resultado.ok ? resultado.mensaje : resultado.error;
  if (!texto) return null;
  return (
    <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: resultado.ok ? "#16a34a" : "#b91c1c" }}>
      {texto}
    </p>
  );
}
