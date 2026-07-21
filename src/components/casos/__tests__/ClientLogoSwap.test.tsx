import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ClientLogoSwap } from "../ClientLogoSwap";

/** Todas las <img> renderizadas, en orden. */
function imgs(container: HTMLElement) {
  return Array.from(container.querySelectorAll("img"));
}

describe("ClientLogoSwap", () => {
  test("logo normal: renderiza negativo + positivo para el swap en hover", () => {
    const { container } = render(
      <ClientLogoSwap
        src="/img/casos/marina-padel/logo/positivo.png"
        alt="Marina Pádel"
        width={320}
        height={160}
      />,
    );
    const found = imgs(container);
    expect(found).toHaveLength(2);
    expect(found[0].getAttribute("src")).toContain("negativo.png");
    expect(found[0].className).toContain("group-hover:opacity-0");
    expect(found[1].getAttribute("src")).toContain("positivo.png");
  });

  test("marca monocroma (hydrup): sin swap, sólo el negativo", () => {
    // Su positivo es tinta negra sobre transparente: al hacer hover en dark
    // desaparecía (negro sobre negro).
    const { container } = render(
      <ClientLogoSwap
        src="/img/casos/hydrup/logo/positivo.png"
        alt="Hydrup"
        width={320}
        height={160}
      />,
    );
    const found = imgs(container);
    expect(found).toHaveLength(1);
    expect(found[0].getAttribute("src")).toContain("negativo.png");
    expect(found[0].className).not.toContain("group-hover:opacity-0");
  });

  test("staticWhite fuerza una sola imagen en negativo", () => {
    const { container } = render(
      <ClientLogoSwap
        src="/img/casos/adamo/logo/positivo.webp"
        alt="Adamo"
        width={320}
        height={160}
        staticWhite
      />,
    );
    expect(imgs(container)).toHaveLength(1);
    expect(imgs(container)[0].getAttribute("src")).toContain("negativo.webp");
  });
});
