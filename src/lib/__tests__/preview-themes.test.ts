import { describe, it, expect } from "vitest";
import {
  PALETTES,
  TYPOGRAPHIES,
  SECTORS,
  SECTOR_ICONS,
  isPaletteSlug,
  isTypographySlug,
  isSectorSlug,
  getPalette,
  getTypography,
  getSectorLabel,
} from "@/lib/preview-themes";

describe("preview-themes catalog", () => {
  it("exposes exactly 6 palettes with required fields", () => {
    expect(PALETTES).toHaveLength(6);
    for (const p of PALETTES) {
      expect(p.slug).toMatch(/^[a-z-]+$/);
      expect(p.name).toBeTruthy();
      expect(p.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.surface).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.text).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.heroGradient).toContain("gradient");
    }
  });

  it("exposes exactly 4 typographies with required fields", () => {
    expect(TYPOGRAPHIES).toHaveLength(4);
    for (const t of TYPOGRAPHIES) {
      expect(t.slug).toMatch(/^[a-z-]+$/);
      expect(t.name).toBeTruthy();
      expect(t.displayVar).toMatch(/^--/);
      expect(t.bodyVar).toMatch(/^--/);
    }
  });

  it("provides an icon per sector and an 'otro' fallback", () => {
    expect(SECTORS.length).toBeGreaterThanOrEqual(7);
    for (const s of SECTORS) {
      expect(SECTOR_ICONS[s.slug]).toBeTruthy();
    }
    expect(SECTOR_ICONS.otro).toBeTruthy();
  });

  it("isPaletteSlug guards correctly", () => {
    expect(isPaletteSlug("brisa-azul")).toBe(true);
    expect(isPaletteSlug("nope")).toBe(false);
  });

  it("isTypographySlug guards correctly", () => {
    expect(isTypographySlug("moderna-sans")).toBe(true);
    expect(isTypographySlug("nope")).toBe(false);
  });

  it("isSectorSlug guards correctly", () => {
    expect(isSectorSlug("salud")).toBe(true);
    expect(isSectorSlug("nope")).toBe(false);
  });

  it("getPalette returns the matching palette", () => {
    const p = getPalette("brisa-azul");
    expect(p?.slug).toBe("brisa-azul");
  });

  it("getPalette returns undefined for unknown slug", () => {
    expect(getPalette("no-existe")).toBeUndefined();
  });

  it("getTypography returns the matching typography", () => {
    const t = getTypography("moderna-sans");
    expect(t?.slug).toBe("moderna-sans");
  });

  it("getTypography returns undefined for unknown slug", () => {
    expect(getTypography("no-existe")).toBeUndefined();
  });

  it("getSectorLabel returns the label for known slug", () => {
    expect(getSectorLabel("salud")).toBe("Salud");
  });

  it("getSectorLabel falls back to the slug for unknown values", () => {
    expect(getSectorLabel("inventado")).toBe("inventado");
  });
});
