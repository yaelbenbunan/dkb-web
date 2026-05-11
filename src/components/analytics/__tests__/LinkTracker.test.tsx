import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { LinkTracker } from "@/components/analytics/LinkTracker";

vi.mock("@/lib/gtm", () => ({
  track: vi.fn(),
}));

import { track } from "@/lib/gtm";

const mockedTrack = track as unknown as ReturnType<typeof vi.fn>;

function clickAnchor(opts: { href: string; wrapper?: "header" | "footer" }) {
  const a = document.createElement("a");
  a.href = opts.href;
  a.textContent = "x";
  const parent = opts.wrapper
    ? document.createElement(opts.wrapper)
    : document.body;
  parent.appendChild(a);
  if (opts.wrapper) document.body.appendChild(parent);
  a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  return { a, parent };
}

describe("LinkTracker", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
    render(<LinkTracker />);
  });

  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
  });

  it("tracks phone_call on tel: click with link_location=page when not in header/footer", () => {
    clickAnchor({ href: "tel:+34657559397" });
    expect(mockedTrack).toHaveBeenCalledWith("phone_call", {
      link_location: "page",
      link_url: "tel:+34657559397",
    });
  });

  it("tracks email_click on mailto: click with header location", () => {
    clickAnchor({ href: "mailto:hola@dinkbit.com", wrapper: "header" });
    expect(mockedTrack).toHaveBeenCalledWith("email_click", {
      link_location: "header",
      link_url: "mailto:hola@dinkbit.com",
    });
  });

  it("tracks whatsapp_click on wa.me click with footer location", () => {
    clickAnchor({ href: "https://wa.me/34657559397", wrapper: "footer" });
    expect(mockedTrack).toHaveBeenCalledWith("whatsapp_click", {
      link_location: "footer",
      link_url: "https://wa.me/34657559397",
    });
  });

  it("tracks whatsapp_click on api.whatsapp.com click", () => {
    clickAnchor({ href: "https://api.whatsapp.com/send?phone=34657559397" });
    expect(mockedTrack).toHaveBeenCalledWith("whatsapp_click", expect.objectContaining({
      link_location: "page",
    }));
  });

  it("does NOT track regular http links", () => {
    clickAnchor({ href: "https://dinkbit.es/nosotros" });
    expect(mockedTrack).not.toHaveBeenCalled();
  });

  it("tracks when click target is a child element of the anchor", () => {
    const a = document.createElement("a");
    a.href = "tel:+34657559397";
    const span = document.createElement("span");
    span.textContent = "Llámanos";
    a.appendChild(span);
    document.body.appendChild(a);
    span.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(mockedTrack).toHaveBeenCalledWith("phone_call", expect.any(Object));
  });
});
