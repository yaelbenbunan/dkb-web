import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LeadsConsulta } from "../LeadsConsulta";

const LEADS = [
  { id: "a", created_at: "2026-10-01T10:00:00Z", name: "Ana", phone: "600111222", email: "ana@x.es", channel: "Meta", campaign: "kd", status: "seguimiento", account_manager: "Paula G", archived: false },
  { id: "b", created_at: "2026-09-01T10:00:00Z", name: null, phone: null, email: "b@x.es", channel: null, campaign: null, status: "nuevo", account_manager: null, archived: true },
];

describe("LeadsConsulta (el /panel viejo en solo lectura)", () => {
  test("avisa de que los leads están en ventas y enlaza al CRM de dinkbit", () => {
    render(<LeadsConsulta leads={LEADS} />);
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("Los leads se gestionan ahora en /panel/ventas");
    expect(within(aviso).getByRole("link")).toHaveAttribute("href", "/panel/ventas/dinkbit");
  });

  test("enseña los leads sin nada editable", () => {
    const { container } = render(<LeadsConsulta leads={LEADS} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Volver a llamar")).toBeInTheDocument();
    expect(container.querySelectorAll("input, select, textarea, button")).toHaveLength(0);
  });
});
