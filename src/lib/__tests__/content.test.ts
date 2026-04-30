import { describe, it, expect } from "vitest";
import { getAllServices, getServiceBySlug } from "@/lib/content";

describe("content loader (services)", () => {
  it("loads all services from /content/servicios", () => {
    const services = getAllServices();
    expect(services.length).toBeGreaterThan(0);
    expect(services[0]).toMatchObject({
      slug: expect.any(String),
      title: expect.any(String),
      order: expect.any(Number),
    });
  });

  it("getServiceBySlug returns the right one", () => {
    const s = getServiceBySlug("desarrollo-web");
    expect(s?.title).toBe("Desarrollo web");
  });

  it("getServiceBySlug returns undefined for unknown slug", () => {
    expect(getServiceBySlug("does-not-exist")).toBeUndefined();
  });

  it("services are sorted by `order` ascending", () => {
    const services = getAllServices();
    const orders = services.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
