import { describe, expect, test } from "vitest";
import { shouldShowPopup, markPopupSeen } from "../promo-popup-storage";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

const DAY = 864e5;

describe("promo popup frequency", () => {
  test("shows when never seen", () => {
    expect(shouldShowPopup(Date.now(), 7, fakeStorage())).toBe(true);
  });

  test("hides within the frequency window, shows after it", () => {
    const s = fakeStorage();
    const t0 = 1_700_000_000_000;
    markPopupSeen(t0, s);
    expect(shouldShowPopup(t0 + 3 * DAY, 7, s)).toBe(false);
    expect(shouldShowPopup(t0 + 8 * DAY, 7, s)).toBe(true);
  });

  test("shows again if the stored value is corrupt", () => {
    expect(shouldShowPopup(Date.now(), 7, fakeStorage({ dkb_promo_verano: "xxx" }))).toBe(true);
  });
});
