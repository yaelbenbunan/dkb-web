"use client";

interface Value {
  businessType: "informativa" | "ecommerce" | null;
  ecommerceKind: "productos" | "servicios" | null;
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

export function StepBusinessType({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">¿Qué tipo de web quieres?</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            onChange({ businessType: "informativa", ecommerceKind: null })
          }
          className={`rounded-xl border-2 p-6 text-left transition ${
            value.businessType === "informativa"
              ? "border-accent bg-accent/10"
              : "border-border hover:border-accent/50"
          }`}
        >
          <p className="text-lg font-semibold">🌐 Informativa</p>
          <p className="mt-1 text-sm text-fg-muted">
            Web para presentar tu marca, servicios y captar contactos.
          </p>
        </button>
        {/* Ecommerce — todavía no desarrollado: no seleccionable */}
        <div
          aria-disabled="true"
          className="relative cursor-not-allowed select-none rounded-xl border-2 border-dashed border-border p-6 text-left opacity-60"
        >
          <span className="absolute right-3 top-3 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
            Próximamente
          </span>
          <p className="text-lg font-semibold">🛒 Ecommerce</p>
          <p className="mt-1 text-sm text-fg-muted">
            Para vender online con catálogo, carrito y pagos.
          </p>
        </div>
      </div>

      {value.businessType === "ecommerce" && (
        <div>
          <p className="mb-3 text-sm font-semibold text-fg-muted">
            ¿Productos o servicios?
          </p>
          <div className="flex gap-3">
            {(["productos", "servicios"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() =>
                  onChange({ businessType: "ecommerce", ecommerceKind: k })
                }
                className={`rounded-lg border-2 px-5 py-2 text-sm font-semibold capitalize transition ${
                  value.ecommerceKind === k
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
