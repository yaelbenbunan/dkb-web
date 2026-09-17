"use client";

import { useActionState } from "react";
import { actualizarCondicionesAction } from "../../../acciones-marcas";
import type { Marca } from "@/lib/ventas/db";
import { ESTADOS_MARCA } from "@/lib/ventas/dominio";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

const euros = (cts: number) => (cts / 100).toString().replace(".", ",");

export function CondicionesForm({ marca, editable }: { marca: Marca; editable: boolean }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(actualizarCondicionesAction.bind(null, marca.id), null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      <h2 style={{ ...titulo, gridColumn: "1 / -1", margin: 0 }}>Condiciones</h2>
      <fieldset disabled={!editable} style={{ display: "contents" }}>
        <label style={etiqueta}>
          Estado
          <select name="estado" defaultValue={marca.estado} style={campo}>
            {ESTADOS_MARCA.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
        <label style={etiqueta}>
          Fecha de inicio
          <input name="fecha_inicio" type="date" defaultValue={marca.fecha_inicio ?? ""} style={campo} />
        </label>
        <label style={etiqueta}>
          Comisión (%)
          <input name="comision_pct" inputMode="decimal" defaultValue={String(marca.comision_pct).replace(".", ",")} style={campo} />
        </label>
        <label style={etiqueta}>
          Plazo de comisión (meses, vacío = para siempre)
          <input name="plazo_meses" inputMode="numeric" defaultValue={marca.plazo_meses ?? ""} style={campo} />
        </label>
        <label style={etiqueta}>
          Cuota mensual fija (€)
          <input name="cuota_mensual" inputMode="decimal" defaultValue={euros(marca.cuota_mensual_cts)} style={campo} />
        </label>
        <label style={etiqueta}>
          Pago por cliente conseguido (€)
          <input name="pago_por_cliente" inputMode="decimal" defaultValue={euros(marca.pago_por_cliente_cts)} style={campo} />
        </label>
        <label style={{ ...etiqueta, gridColumn: "1 / -1" }}>
          SKU de los packs B2B (uno por línea; se usan al importar pedidos en la fase 2)
          <textarea name="skus_b2b" rows={3} defaultValue={marca.skus_b2b.join("\n")} style={campo} />
        </label>
        {editable && (
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
            <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
              Guardar condiciones
            </button>
            <Mensaje resultado={resultado} />
          </div>
        )}
      </fieldset>
    </form>
  );
}
