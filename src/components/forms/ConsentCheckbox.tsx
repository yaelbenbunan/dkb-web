/**
 * Casilla de consentimiento para comunicaciones comerciales.
 *
 * Opcional y desmarcada a propósito. Obligarla condicionaría el consentimiento
 * a obtener otra cosa (el presupuesto, la información) y entonces deja de ser
 * libre: se recogen menos síes, pero los que se recogen valen. La excepción es
 * el popup de la promo, donde el servicio que pide el usuario ES recibir la
 * oferta por email, y ahí sí puede ser obligatoria.
 *
 * El nombre del campo es `consent` en todos los formularios para que las
 * server actions lo lean igual.
 */
export function ConsentCheckbox({ className = "" }: { className?: string }) {
  return (
    <label
      className={`flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 ${className}`}
    >
      <input
        type="checkbox"
        name="consent"
        value="on"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#187bef]"
      />
      <span>Acepto recibir comunicaciones comerciales de dinkbit.</span>
    </label>
  );
}
