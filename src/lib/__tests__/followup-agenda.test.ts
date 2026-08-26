import { describe, expect, test } from "vitest";
import {
  addDays,
  agendaBucket,
  buildAgenda,
  dueCount,
  isFollowupDate,
  todayInMadrid,
  AGENDA_BUCKETS,
} from "../followup-agenda";

const lead = (id: string, followup_at: string | null, archived = false) => ({
  id,
  followup_at,
  archived,
});

describe("isFollowupDate", () => {
  test("acepta fechas ISO de día reales", () => {
    for (const v of ["2026-09-01", "2026-02-28", "2028-02-29", "2026-12-31"]) {
      expect(isFollowupDate(v)).toBe(true);
    }
  });

  test("rechaza formatos raros y días que no existen", () => {
    for (const v of [
      "",
      "01/09/2026",
      "2026-9-1",
      "2026-13-01",
      "2026-02-30",
      "2027-02-29",
      "2026-00-10",
      "2026-01-32",
      "mañana",
      "2026-09-01T10:00:00Z",
    ]) {
      expect(isFollowupDate(v)).toBe(false);
    }
  });
});

describe("addDays", () => {
  test("suma días dentro del mes", () => {
    expect(addDays("2026-09-01", 1)).toBe("2026-09-02");
    expect(addDays("2026-09-01", 7)).toBe("2026-09-08");
  });

  test("cruza el fin de mes y el fin de año", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("el cambio de hora no desplaza el día (se calcula en UTC)", () => {
    // Último domingo de octubre: en Europe/Madrid ese día tiene 25 horas.
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    // Y el de marzo, 23 horas.
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  test("resta con días negativos", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("todayInMadrid", () => {
  test("usa el día de Madrid, no el UTC", () => {
    // 23:30 UTC del 31/08 ya es 01/09 en Madrid (UTC+2 en verano).
    expect(todayInMadrid(new Date("2026-08-31T23:30:00Z"))).toBe("2026-09-01");
    // 00:30 UTC del 01/09 sigue siendo 01/09 en Madrid.
    expect(todayInMadrid(new Date("2026-09-01T00:30:00Z"))).toBe("2026-09-01");
  });

  test("en invierno (UTC+1) también", () => {
    expect(todayInMadrid(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });
});

describe("agendaBucket", () => {
  const hoy = "2026-08-26";

  test("clasifica cada fecha en su tramo", () => {
    expect(agendaBucket("2026-08-20", hoy)).toBe("vencidos");
    expect(agendaBucket("2026-08-25", hoy)).toBe("vencidos");
    expect(agendaBucket(hoy, hoy)).toBe("hoy");
    expect(agendaBucket("2026-08-27", hoy)).toBe("manana");
    expect(agendaBucket("2026-08-28", hoy)).toBe("semana");
    expect(agendaBucket("2026-09-02", hoy)).toBe("semana"); // hoy + 7
    expect(agendaBucket("2026-09-03", hoy)).toBe("despues"); // hoy + 8
    expect(agendaBucket("2026-12-01", hoy)).toBe("despues");
  });
});

describe("buildAgenda", () => {
  const hoy = "2026-08-26";

  test("agrupa, ordena por fecha ascendente y respeta el orden de los tramos", () => {
    const rows = [
      lead("d", "2026-09-15"),
      lead("a", "2026-08-10"),
      lead("c", "2026-08-27"),
      lead("b", hoy),
      lead("a2", "2026-08-24"),
    ];
    const agenda = buildAgenda(rows, hoy);

    expect(agenda.map((g) => g.key)).toEqual(["vencidos", "hoy", "manana", "despues"]);
    expect(agenda[0].rows.map((r) => r.id)).toEqual(["a", "a2"]);
    expect(agenda[1].rows.map((r) => r.id)).toEqual(["b"]);
    expect(agenda[3].rows.map((r) => r.id)).toEqual(["d"]);
  });

  test("no devuelve tramos vacíos", () => {
    const agenda = buildAgenda([lead("a", "2026-12-01")], hoy);
    expect(agenda).toHaveLength(1);
    expect(agenda[0].key).toBe("despues");
  });

  test("deja fuera los leads sin fecha, los archivados y las fechas corruptas", () => {
    const rows = [
      lead("sin-fecha", null),
      lead("archivado", hoy, true),
      lead("corrupto", "mañana por la tarde"),
      lead("bueno", hoy),
    ];
    const agenda = buildAgenda(rows, hoy);
    expect(agenda).toHaveLength(1);
    expect(agenda[0].rows.map((r) => r.id)).toEqual(["bueno"]);
  });

  test("cada tramo lleva su etiqueta y su color", () => {
    const agenda = buildAgenda([lead("a", "2026-08-10")], hoy);
    expect(agenda[0].label).toBe(AGENDA_BUCKETS.vencidos.label);
    expect(agenda[0].color).toBe(AGENDA_BUCKETS.vencidos.color);
  });
});

describe("dueCount", () => {
  const hoy = "2026-08-26";

  test("cuenta lo vencido y lo de hoy — lo que no puede escaparse", () => {
    const rows = [
      lead("a", "2026-08-10"),
      lead("b", hoy),
      lead("c", "2026-08-27"),
      lead("d", "2026-12-01"),
      lead("e", null),
      lead("f", "2026-08-01", true),
    ];
    expect(dueCount(rows, hoy)).toBe(2);
  });

  test("sin nada pendiente, cero", () => {
    expect(dueCount([lead("a", null), lead("b", "2026-12-01")], hoy)).toBe(0);
  });
});
