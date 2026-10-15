import { expect, test } from "vitest";
import { leadVentasDesdePanel } from "../ventas/migracion-panel";

const U = [
  { id: "u-yael", email: "yael.benbunan@dinkbit.com", activa: true },
  { id: "u-pg", email: "paula.garcia@dinkbit.com", activa: true },
  { id: "u-al", email: "alicia.ruiz@dinkbit.com", activa: false },
];
const base = { id: "old-1", created_at: "2026-07-01T10:00:00Z", name: "Ana", email: "ana@x.es", phone: "600111222", sector: "dental", business_name: "Clínica Ana", business_type: null, template: null, style: null, palette: null, value_prop: null, current_website: "ana.es", pdf_path: null, review_rating: null, review_comment: null, status: "seguimiento", channel: "Meta", campaign: "kd", notes: "Llamar tarde", followup: "Pide presupuesto", followup_at: "2026-10-20", account_manager: "Paula G", archived: false, email_status: "delivered", email_message_id: "re_1", email_updated_at: null, consent: true };

test("traduce una fila completa", () => {
  const l = leadVentasDesdePanel(base, U);
  expect(l).toMatchObject({
    id_externo: "old-1", negocio: "Clínica Ana", contacto: "Ana", telefono: "600111222", email: "ana@x.es", web: "ana.es",
    origen: "web", origen_detalle: "kd", fase: "volver_a_llamar", asignada_a: "u-pg", proximo_seguimiento: "2026-10-20",
    canal: "Meta", campana: "kd", etiquetas: [], consentimiento: true, created_at: "2026-07-01T10:00:00Z",
    extra: { sector: "dental" },
  });
  expect(l.notas).toEqual(["Notas de /panel: Llamar tarde", "Seguimiento: Pide presupuesto"]);
});

test("kit digital: fase y etiqueta", () => {
  expect(leadVentasDesdePanel({ ...base, status: "cliente-kit-digital" }, U)).toMatchObject({ fase: "cliente", etiquetas: ["kit-digital"] });
});

test("responsable desactivado o desconocido: sin asignar", () => {
  expect(leadVentasDesdePanel({ ...base, account_manager: "Alicia" }, U).asignada_a).toBeNull();
  expect(leadVentasDesdePanel({ ...base, account_manager: "Otra" }, U).asignada_a).toBeNull();
});

test("sin nombre, email ni teléfono: no se pierde", () => {
  const l = leadVentasDesdePanel({ ...base, name: null, business_name: null, email: null, phone: null }, U);
  expect(l.negocio).toBe("(sin nombre) old-1");
});
