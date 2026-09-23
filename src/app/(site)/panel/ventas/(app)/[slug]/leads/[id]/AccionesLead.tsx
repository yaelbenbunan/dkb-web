"use client";

import { useActionState, useState } from "react";
import { cambiarFaseAction, muestrasEnviadasAction, notaAction, pasarAlEmbudoAction, registrarLlamadaAction } from "../../../../acciones-leads";
import { FASES, FASE_LABELS, MARCA_DINKBIT_SLUG, RESULTADOS_LLAMADA, RESULTADO_LABELS, type Fase } from "@/lib/ventas/dominio";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta } from "../../../../_componentes/estilos";

type Pestana = "llamada" | "muestras" | "nota" | "fase" | "embudo";

const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: "llamada", texto: "Registrar llamada" },
  { clave: "muestras", texto: "Muestras enviadas" },
  { clave: "nota", texto: "Nota" },
  { clave: "fase", texto: "Cambiar fase" },
];

/** Solo la marca de WhatsApp (`dinkbit`) tiene sentido para pasar al embudo
 *  principal del CRM: es la única cuyos leads llevan `channel: "WhatsApp"`. */
const PESTANA_EMBUDO = { clave: "embudo" as const, texto: "Pasar al embudo" };

function Seguimiento({ actual }: { actual: string | null }) {
  return (
    <label style={etiqueta}>
      Próximo seguimiento
      <input name="proximo_seguimiento" type="date" defaultValue={actual ?? ""} style={campo} />
      <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>Déjala vacía para quitar el seguimiento.</span>
    </label>
  );
}

function Nota({ requerida = false }: { requerida?: boolean }) {
  return (
    <label style={etiqueta}>
      Nota
      <textarea name="nota" rows={3} required={requerida} style={campo} />
    </label>
  );
}

export function AccionesLead({
  slug,
  leadId,
  fase,
  proximoSeguimiento,
}: {
  slug: string;
  leadId: string;
  fase: Fase;
  proximoSeguimiento: string | null;
}) {
  const [pestana, setPestana] = useState<Pestana>("llamada");
  const [rLlamada, aLlamada, pLlamada] = useActionState<ResultadoAccion | null, FormData>(registrarLlamadaAction.bind(null, slug, leadId), null);
  const [rMuestras, aMuestras, pMuestras] = useActionState<ResultadoAccion | null, FormData>(muestrasEnviadasAction.bind(null, slug, leadId), null);
  const [rNota, aNota, pNota] = useActionState<ResultadoAccion | null, FormData>(notaAction.bind(null, slug, leadId), null);
  const [rFase, aFase, pFase] = useActionState<ResultadoAccion | null, FormData>(cambiarFaseAction.bind(null, slug, leadId), null);
  const [rEmbudo, aEmbudo, pEmbudo] = useActionState<ResultadoAccion | null, FormData>(pasarAlEmbudoAction.bind(null, slug, leadId), null);

  const pestanas = slug === MARCA_DINKBIT_SLUG ? [...PESTANAS, PESTANA_EMBUDO] : PESTANAS;
  const formulario = { display: "flex", flexDirection: "column", gap: 10 } as const;

  return (
    <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {pestanas.map((p) => (
          <button
            key={p.clave}
            type="button"
            onClick={() => setPestana(p.clave)}
            style={{ ...(pestana === p.clave ? botonPrimario : botonSecundario), padding: "6px 12px", fontSize: 13 }}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === "llamada" && (
        <form action={aLlamada} style={formulario}>
          <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <legend style={{ ...etiqueta, marginBottom: 6 }}>Resultado</legend>
            {RESULTADOS_LLAMADA.map((r) => (
              <label key={r} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 8px" }}>
                <input type="radio" name="resultado" value={r} required /> {RESULTADO_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <Nota />
          <Seguimiento actual={proximoSeguimiento} />
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            «No le interesa» y «Número erróneo» cierran el lead y borran el seguimiento.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pLlamada} style={botonPrimario}>Guardar llamada</button>
            <Mensaje resultado={rLlamada} />
          </div>
        </form>
      )}

      {pestana === "muestras" && (
        <form action={aMuestras} style={formulario}>
          <Nota />
          <Seguimiento actual={proximoSeguimiento} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pMuestras} style={botonPrimario}>Apuntar envío de muestras</button>
            <Mensaje resultado={rMuestras} />
          </div>
        </form>
      )}

      {pestana === "nota" && (
        <form action={aNota} style={formulario}>
          <Nota requerida />
          <Seguimiento actual={proximoSeguimiento} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pNota} style={botonPrimario}>Añadir nota</button>
            <Mensaje resultado={rNota} />
          </div>
        </form>
      )}

      {pestana === "fase" && (
        <form action={aFase} style={formulario}>
          <label style={etiqueta}>
            Nueva fase
            <select name="fase" defaultValue={fase} style={campo}>
              {FASES.map((f) => (
                <option key={f} value={f}>{FASE_LABELS[f]}</option>
              ))}
            </select>
          </label>
          <Nota />
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Queda registrado en el historial con tu nombre.</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pFase} style={botonPrimario}>Cambiar fase</button>
            <Mensaje resultado={rFase} />
          </div>
        </form>
      )}

      {pestana === "embudo" && (
        <form action={aEmbudo} style={formulario}>
          <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
            Crea este lead en el embudo del CRM principal (canal WhatsApp) y deja constancia en el historial.
            Es una decisión que se toma a mano, lead a lead: pulsar dos veces no crea un duplicado.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pEmbudo} style={botonPrimario}>Pasar al embudo</button>
            <Mensaje resultado={rEmbudo} />
          </div>
        </form>
      )}
    </section>
  );
}
