import { describe, expect, test } from "vitest";
import { checkScheduleTime } from "../campaign-schedule";

const NOW = new Date("2026-09-16T10:00:00Z");

describe("checkScheduleTime", () => {
  test("acepta una hora futura y la devuelve en ISO", () => {
    expect(checkScheduleTime("2026-09-17T08:30:00Z", NOW)).toEqual({
      ok: true,
      iso: "2026-09-17T08:30:00.000Z",
    });
  });

  test("rechaza el pasado y lo que está a menos de 5 minutos", () => {
    expect(checkScheduleTime("2026-09-16T09:00:00Z", NOW).ok).toBe(false);
    expect(checkScheduleTime("2026-09-16T10:03:00Z", NOW).ok).toBe(false);
  });

  test("rechaza fechas vacías, inválidas o a más de 90 días", () => {
    expect(checkScheduleTime("", NOW).ok).toBe(false);
    expect(checkScheduleTime("mañana", NOW).ok).toBe(false);
    expect(checkScheduleTime("2027-01-01T10:00:00Z", NOW).ok).toBe(false);
  });
});
