import { SQL_ALTAS } from "@/lib/altas/db";
import { tarjeta } from "../../_componentes/estilos";

export function AvisoMigracion() {
  return (
    <section role="alert" style={{ ...tarjeta, borderColor: "#f59e0b", background: "#fffbeb", color: "#78350f" }}>
      <strong>Falta preparar la base de datos para las altas.</strong>
      <p style={{ margin: "6px 0 0", fontSize: 14 }}>
        Ejecuta <code>{SQL_ALTAS}</code> en el SQL Editor de Supabase. El resto del panel funciona con normalidad.
      </p>
    </section>
  );
}
