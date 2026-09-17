"use client";

import { useActionState } from "react";
import { actualizarLeadAction } from "../../../../acciones-leads";
import type { Lead } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { TIPOS_NEGOCIO, TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../../_componentes/estilos";

export function DatosLead({ slug, lead }: { slug: string; lead: Lead }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(actualizarLeadAction.bind(null, slug, lead.id), null);
  const texto = (nombre: keyof Lead, rotulo: string, tipo = "text") => (
    <label style={etiqueta}>
      {rotulo}
      <input name={nombre} type={tipo} defaultValue={(lead[nombre] as string | null) ?? ""} style={campo} />
    </label>
  );
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Datos</h2>
      {texto("negocio", "Negocio")}
      <label style={etiqueta}>
        Tipo de negocio
        <select name="tipo_negocio" defaultValue={lead.tipo_negocio ?? ""} style={campo}>
          <option value="">—</option>
          {TIPOS_NEGOCIO.map((t) => (
            <option key={t} value={t}>{TIPO_NEGOCIO_LABELS[t]}</option>
          ))}
        </select>
      </label>
      {texto("contacto", "Persona de contacto")}
      {texto("telefono", "Teléfono", "tel")}
      {texto("email", "Email", "email")}
      {texto("ciudad", "Ciudad")}
      {texto("cif", "CIF")}
      {texto("web", "Web")}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={pendiente} style={botonPrimario}>Guardar datos</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
