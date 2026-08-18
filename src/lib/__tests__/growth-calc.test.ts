import { describe, expect, test } from "vitest";
import { parseImporte } from "../growth-calc";

describe("parseImporte", () => {
  test("número pelado", () => {
    expect(parseImporte("1500")).toBe(1500);
  });

  test("punto como separador de miles (formato español)", () => {
    expect(parseImporte("1.500")).toBe(1500);
    expect(parseImporte("1.500.000")).toBe(1500000);
  });

  test("coma como separador decimal", () => {
    expect(parseImporte("1500,50")).toBe(1500.5);
    expect(parseImporte("1.500,50")).toBe(1500.5);
  });

  test("punto como decimal cuando no son grupos de tres", () => {
    expect(parseImporte("1500.50")).toBe(1500.5);
    expect(parseImporte("0.5")).toBe(0.5);
  });

  test("ignora símbolos, espacios y texto", () => {
    expect(parseImporte(" 1 500 € ")).toBe(1500);
    expect(parseImporte("1500 euros")).toBe(1500);
  });

  test("vacío o sin dígitos devuelve null", () => {
    expect(parseImporte("")).toBeNull();
    expect(parseImporte("   ")).toBeNull();
    expect(parseImporte("no lo sé")).toBeNull();
  });

  test("negativos se tratan como no informados", () => {
    // Un importe negativo no significa nada aquí y colarlo produciría un
    // coste por paciente negativo en pantalla.
    expect(parseImporte("-300")).toBeNull();
  });

  test("rangos escritos a mano: se queda con el primer número", () => {
    // Respuestas humanas naturalísimas en un campo libre. Sin el corte del
    // rango, "20-25" pierde el guion y concatena a 2025, y "3 o 4" a 34: un
    // error de varios órdenes de magnitud presentado como si fuera el dato
    // del usuario.
    expect(parseImporte("20-25")).toBe(20);
    expect(parseImporte("3 o 4")).toBe(3);
    expect(parseImporte("5 a 10")).toBe(5);
    expect(parseImporte("1.500-2.000")).toBe(1500);
  });
});

import { calcular } from "../growth-calc";

describe("calcular", () => {
  test("rama A: sabe inversión y pacientes", () => {
    const r = calcular({ inversion: 1500, pacientes: 17, ticket: null });
    expect(r.rama).toBe("A");
    expect(r.costePorPaciente).toBe(88.24);
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
    expect(r.sinPacientes).toBe(false);
  });

  test("rama A con ticket medio: generado y retorno", () => {
    const r = calcular({ inversion: 1000, pacientes: 10, ticket: 400 });
    expect(r.rama).toBe("A");
    expect(r.costePorPaciente).toBe(100);
    expect(r.generado).toBe(4000);
    expect(r.retorno).toBe(4);
  });

  test("rama B: no sabe cuántos pacientes le llegan", () => {
    const r = calcular({ inversion: 1500, pacientes: null, ticket: 400 });
    expect(r.rama).toBe("B");
    expect(r.costePorPaciente).toBeNull();
    // Sin número de pacientes no se puede estimar lo generado.
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
    expect(r.sinPacientes).toBe(false);
  });

  test("rama B con cero pacientes: invierte y no llega nadie", () => {
    const r = calcular({ inversion: 1500, pacientes: 0, ticket: null });
    expect(r.rama).toBe("B");
    expect(r.sinPacientes).toBe(true);
    // Lo que nunca debe pasar: Infinity o NaN en pantalla.
    expect(r.costePorPaciente).toBeNull();
  });

  test("rama C: no invierte todavía", () => {
    const r = calcular({ inversion: null, pacientes: 5, ticket: 400 });
    expect(r.rama).toBe("C");
    expect(r.costePorPaciente).toBeNull();
    // Esos pacientes existen y son orgánicos: se puede decir cuánto valen.
    expect(r.generado).toBe(2000);
    // Pero sin inversión no hay retorno que calcular.
    expect(r.retorno).toBeNull();
  });

  test("inversión cero se trata igual que no invertir", () => {
    expect(calcular({ inversion: 0, pacientes: 5, ticket: null }).rama).toBe("C");
  });

  test("números absurdos no rompen ni devuelven NaN", () => {
    const r = calcular({ inversion: 9_999_999, pacientes: 5000, ticket: 1 });
    expect(Number.isFinite(r.costePorPaciente as number)).toBe(true);
    expect(Number.isFinite(r.generado as number)).toBe(true);
  });

  test("todo desconocido: rama C, sin cifras", () => {
    const r = calcular({ inversion: null, pacientes: null, ticket: null });
    expect(r.rama).toBe("C");
    expect(r.costePorPaciente).toBeNull();
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
  });
});

import { formatEur } from "../growth-calc";

describe("formatEur", () => {
  test("formatea con coma decimal y símbolo", () => {
    expect(formatEur(88.24)).toBe("88,24 €");
    expect(formatEur(100)).toBe("100,00 €");
    expect(formatEur(0)).toBe("0,00 €");
  });

  test("pone separador de miles", () => {
    expect(formatEur(4000)).toBe("4.000,00 €");
    expect(formatEur(6800)).toBe("6.800,00 €");
    expect(formatEur(1500000)).toBe("1.500.000,00 €");
  });
});

import { rentabilidad, proyectar, simular } from "../growth-calc";

describe("rentabilidad", () => {
  test("lo que deja cada paciente y lo que deja al mes", () => {
    // 1.500 € para 45 pacientes con ticket de 250 €.
    const r = rentabilidad(calcular({ inversion: 1500, pacientes: 45, ticket: 250 }));
    expect(r).not.toBeNull();
    // 250 menos los 33,33 que cuesta traerlo.
    expect(r?.dejaPorPaciente).toBe(216.67);
    // 11.250 generados menos 1.500 invertidos.
    expect(r?.dejaAlMes).toBe(9750);
    // 33,33 sobre 250.
    expect(r?.pesoCaptacion).toBe(0.13);
  });

  test("sin ticket medio no hay rentabilidad que calcular", () => {
    expect(rentabilidad(calcular({ inversion: 1500, pacientes: 45, ticket: null }))).toBeNull();
  });

  test("un coste por encima del ticket deja pérdida por paciente", () => {
    // Cuesta 300 € traer a quien paga 200 €.
    const r = rentabilidad(calcular({ inversion: 3000, pacientes: 10, ticket: 200 }));
    expect(r?.dejaPorPaciente).toBe(-100);
    expect(r?.dejaAlMes).toBe(-1000);
  });
});

describe("proyectar", () => {
  test("coste disparado: baja el coste y mantiene la inversión", () => {
    // 200 € de captación sobre un ticket de 400 € = 50%, muy por encima del 30 %.
    const p = proyectar(calcular({ inversion: 2000, pacientes: 10, ticket: 400 }));
    expect(p?.escenario).toBe("bajar-coste");
    expect(p?.inversion).toBe(2000);
    expect(p?.inversionExtra).toBe(0);
    // El coste baja un 20 %: de 200 a 160.
    expect(p?.costePorPaciente).toBe(160);
    // Con el mismo dinero entran 12 en vez de 10.
    expect(p?.pacientes).toBe(12);
    expect(p?.pacientesExtra).toBe(2);
    expect(p?.generadoExtra).toBe(800);
  });

  test("hay margen: sube la inversión y además afina el coste", () => {
    // 33,33 sobre 250 = 13 %: por debajo del 30 %, pero por encima del 10 %,
    // así que todavía queda recorrido en el coste.
    const p = proyectar(calcular({ inversion: 1500, pacientes: 45, ticket: 250 }));
    expect(p?.escenario).toBe("subir-inversion");
    expect(p?.inversion).toBe(2250);
    expect(p?.inversionExtra).toBe(750);
    // Nuestro trabajo baja el coste un 10 % (33,33 → 30), pero escalar a 1,5x
    // lo encarece un 5,85 %: queda en 31,75. Sigue siendo mejor que hoy, y es
    // la cifra honesta.
    expect(p?.costePorPaciente).toBe(31.75);
    // 2.250 / 31,75 = 70,8 → 70.
    expect(p?.pacientes).toBe(70);
    expect(p?.pacientesExtra).toBe(25);
    expect(p?.generado).toBe(17500);
    expect(p?.generadoExtra).toBe(6250);
  });

  test("la proyección y el simulador coinciden en el mismo presupuesto", () => {
    // Van por el mismo modelo a propósito: dos cifras distintas para el mismo
    // dinero destruirían la credibilidad de toda la pieza.
    const base = calcular({ inversion: 1500, pacientes: 45, ticket: 250 });
    const p = proyectar(base)!;
    // Con `costeSinEscalar`, que es justo lo que la pantalla le pasa al
    // deslizador: usar `costePorPaciente` encarecería dos veces.
    const s = simular({
      inversion: p.inversion,
      costeBase: p.costeSinEscalar,
      inversionBase: 1500,
      ticket: 250,
    });
    expect(s.pacientes).toBe(p.pacientes);
    expect(s.generado).toBe(p.generado);
    expect(s.costePorPaciente).toBe(p.costePorPaciente);
  });

  test("coste ya afinado: solo sube la inversión, sin recortarlo", () => {
    // 10 € de captación sobre un ticket de 500 € = 2 %. Prometer bajarlo
    // todavía más sería vender humo, así que solo se escala.
    const p = proyectar(calcular({ inversion: 1000, pacientes: 100, ticket: 500 }));
    expect(p?.escenario).toBe("subir-inversion");
    expect(p?.inversion).toBe(1500);
    // Sin recorte, pero con el encarecimiento de escalar a 1,5x.
    expect(p?.costePorPaciente).toBe(10.58);
    expect(p?.pacientes).toBe(141);
    expect(p?.pacientesExtra).toBe(41);
  });

  test("no invierte nada: simula un arranque con su propio ticket", () => {
    const p = proyectar(calcular({ inversion: null, pacientes: null, ticket: 300 }));
    expect(p?.escenario).toBe("empezar");
    expect(p?.inversion).toBe(800);
    // Captación al 20 % de un ticket de 300 €.
    expect(p?.costePorPaciente).toBe(60);
    expect(p?.pacientes).toBe(13);
    expect(p?.generado).toBe(3900);
  });

  test("sin ticket no se proyecta nada", () => {
    // Sabemos lo que cuesta un paciente pero no lo que vale: prometer una
    // cifra de facturación sería inventarla.
    expect(proyectar(calcular({ inversion: 1500, pacientes: 45, ticket: null }))).toBeNull();
    expect(proyectar(calcular({ inversion: null, pacientes: null, ticket: null }))).toBeNull();
  });

  test("simular: por debajo o igual a la base, el coste no se toca", () => {
    const s = simular({ inversion: 1500, costeBase: 30, inversionBase: 1500, ticket: 250 });
    expect(s.costePorPaciente).toBe(30);
    expect(s.pacientes).toBe(50);
    expect(s.generado).toBe(12500);
    // 12.500 generados menos 1.500 invertidos.
    expect(s.deja).toBe(11000);

    // Invirtiendo menos tampoco se promete un coste mejor.
    expect(simular({ inversion: 750, costeBase: 30, inversionBase: 1500, ticket: 250 }).costePorPaciente).toBe(30);
  });

  test("simular: al escalar, el coste por paciente sube", () => {
    // El doble de inversión encarece la captación un 10 %.
    const doble = simular({ inversion: 3000, costeBase: 30, inversionBase: 1500, ticket: 250 });
    expect(doble.costePorPaciente).toBe(33);
    expect(doble.pacientes).toBe(90);

    // El cuádruple, un 20 %.
    const cuadruple = simular({ inversion: 6000, costeBase: 30, inversionBase: 1500, ticket: 250 });
    expect(cuadruple.costePorPaciente).toBe(36);
  });

  test("simular: nunca devuelve pacientes a medias ni cifras infinitas", () => {
    const s = simular({ inversion: 1000, costeBase: 33.33, inversionBase: 1000, ticket: 250 });
    // 1.000 / 33,33 = 30,003 → 30, a la baja.
    expect(s.pacientes).toBe(30);
    expect(Number.isFinite(s.generado)).toBe(true);

    // Un coste base absurdo no puede producir una división por cero.
    const cero = simular({ inversion: 1000, costeBase: 0, inversionBase: 1000, ticket: 250 });
    expect(cero.pacientes).toBe(0);
    expect(cero.generado).toBe(0);
  });

  test("nunca proyecta una mejora que no lo sea", () => {
    // Si por redondeos la proyección no superase la situación actual, no se
    // enseña: prometer lo mismo o menos no es ser conservador, es absurdo.
    const p = proyectar(calcular({ inversion: 1500, pacientes: 45, ticket: 250 }));
    expect(p?.pacientesExtra).toBeGreaterThan(0);
    expect(p?.generadoExtra).toBeGreaterThan(0);
  });
});
