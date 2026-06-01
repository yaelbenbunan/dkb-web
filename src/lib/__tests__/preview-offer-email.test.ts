import { describe, it, expect } from "vitest";
import {
  buildOfferEmail,
  OFFER,
  OFFER_DISCLAIMER,
} from "@/lib/preview-offer-email";

const base = {
  name: "Yael Benbunán",
  businessName: "La Cantina",
  leadId: "abcd1234-ef56",
  deadlineMs: 1900000000000,
  countdownUrl: "https://www.dinkbit.es/api/countdown?d=1900000000000&a=187bef",
};

describe("buildOfferEmail", () => {
  it("includes both the struck price and the offer price", () => {
    const { html } = buildOfferEmail(base);
    expect(html).toContain(OFFER.priceNormal); // 2.000€
    expect(html).toContain(OFFER.priceOffer); // 1.000€
    expect(html).toContain("-50%");
  });

  it("embeds the countdown GIF and the disclaimer", () => {
    const { html } = buildOfferEmail(base);
    expect(html).toContain(base.countdownUrl);
    expect(html).toContain(OFFER_DISCLAIMER.slice(0, 40));
  });

  it("uses the first name and escapes HTML in user input", () => {
    const { html, subject } = buildOfferEmail({
      ...base,
      name: "<b>Yael</b>",
      businessName: 'Bar "El <script>"',
    });
    expect(subject).toContain("Yael");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("produces a plain-text alternative with the offer", () => {
    const { text } = buildOfferEmail(base);
    expect(text).toContain("1.000€");
    expect(text.toLowerCase()).toContain("48 h");
  });

  it("builds a mailto CTA referencing the lead id", () => {
    const { html } = buildOfferEmail(base);
    expect(html).toContain(`mailto:${OFFER.contactEmail}`);
    expect(html).toContain("abcd1234-ef56");
  });
});
