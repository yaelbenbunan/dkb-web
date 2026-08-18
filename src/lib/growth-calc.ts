/**
 * Cálculo del coste por paciente de la calculadora de /growth.
 *
 * Módulo puro a propósito: nada de React, nada de red. Es la pieza con más
 * riesgo de bug silencioso (divisiones por cero, NaN en pantalla, formatos de
 * número españoles) y así se puede testear sola.
 */

export type Rama = "A" | "B" | "C";

export interface CalcInput {
  /** null = "no invierto todavía". */
  inversion: number | null;
  /** null = "no lo sé". */
  pacientes: number | null;
  /** null = no lo quiso decir. */
  ticket: number | null;
}

export interface CalcResult {
  rama: Rama;
  costePorPaciente: number | null;
  generado: number | null;
  retorno: number | null;
  /** Invierte pero no le llega ningún paciente: mensaje propio dentro de la rama B. */
  sinPacientes: boolean;
  /**
   * Los datos de entrada, ya normalizados, devueltos tal cual.
   *
   * La pantalla de resultado pinta el embudo del usuario con sus propias
   * cifras, y necesita las de partida además de las calculadas. Se devuelven
   * desde aquí en vez de re-parsearlas en el cliente para que lo que se
   * enseña sea exactamente lo que se ha calculado, sin margen a que las dos
   * versiones se separen.
   */
  entrada: CalcInput;
}

/**
 * Se queda con la primera cifra cuando el texto es un rango escrito a mano
 * ("20-25", "3 o 4", "5 a 10", "1.500-2.000"). Son respuestas humanas
 * naturalísimas en un campo libre, y sin este corte la limpieza de abajo
 * borraría el guion o las palabras y concatenaría los dos números
 * ("20-25" → 2025, "3 o 4" → 34): un error de varios órdenes de magnitud que
 * el usuario vería presentado como si fuera su propio dato.
 *
 * Corta solo por guion (que no sea el signo negativo inicial: "-300" no debe
 * tocarse) y por las palabras sueltas o/a/y entre espacios. No corta por
 * espacios sueltos a propósito: " 1 500 € " es un solo número con espacio
 * como separador de miles, y distinguir ese caso de un rango sin más marcas
 * sería ambiguo.
 */
function primerNumeroDeRango(s: string): string {
  const m = s.match(/^(.*?\d(?:[.,]\d+)?)\s*(?:-\s*\d|\s+(?:o|a|y)\s+\d)/i);
  return m ? m[1] : s;
}

/**
 * Normaliza un importe escrito a mano. Acepta formato español ("1.500,50"),
 * inglés ("1500.50"), con símbolos y con espacios.
 *
 * Regla para desambiguar el punto: si el último grupo tras un punto tiene
 * exactamente tres dígitos, es separador de miles; si no, es decimal. Eso
 * resuelve bien "1.500" (1500) y "1500.50" (1500,5). El caso "1.234" se
 * interpreta como 1234, que es lo correcto para importes en euros.
 *
 * Nota: No soporta el formato inglés con coma de miles (12,345.50) porque
 * sería indistinguible del español (coma decimal). La audiencia son clínicas
 * españolas escribiendo formato español, así que la ambigüedad produciría
 * errores peores que la incompletitud.
 */
export function parseImporte(raw: string): number | null {
  const limpio = primerNumeroDeRango(raw ?? "").replace(/[^\d.,-]/g, "");
  if (!limpio || !/\d/.test(limpio)) return null;
  const negativo = limpio.trimStart().startsWith("-");
  let s = limpio.replace(/-/g, "");

  if (s.includes(",")) {
    // La coma manda como decimal; los puntos son miles.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const grupos = s.split(".");
    const ultimo = grupos.length > 1 ? grupos[grupos.length - 1] : "";
    if (grupos.length > 1 && ultimo.length === 3) s = grupos.join("");
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  // Un importe negativo produciría un coste por paciente negativo en pantalla:
  // se trata como no informado.
  if (negativo || n < 0) return null;
  return n;
}

/** Redondeo a dos decimales, para que los tests sean deterministas y no salga
 *  "88.23529411764706" en pantalla. */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Decide la rama del resultado y calcula lo que se pueda con lo que hay.
 *
 * Las tres ramas son discursos distintos, no grados del mismo:
 *   A: sabe sus números → se le da su coste por paciente.
 *   B: no sabe cuántos pacientes le llegan → "no se puede calcular, y eso es
 *      el hallazgo". Por volumen será la mayoritaria.
 *   C: no invierte todavía → crear demanda, no arreglar medición.
 */
export function calcular(input: CalcInput): CalcResult {
  const { inversion, pacientes, ticket } = input;
  const invierte = inversion !== null && inversion > 0;
  const sabePacientes = pacientes !== null;
  const sinPacientes = invierte && pacientes === 0;

  const generado =
    sabePacientes && pacientes > 0 && ticket !== null && ticket > 0
      ? redondear(pacientes * ticket)
      : null;

  if (!invierte) {
    return {
      rama: "C",
      costePorPaciente: null,
      generado,
      retorno: null,
      sinPacientes: false,
      entrada: input,
    };
  }

  if (!sabePacientes || pacientes === 0) {
    return {
      rama: "B",
      costePorPaciente: null,
      generado: null,
      retorno: null,
      sinPacientes,
      entrada: input,
    };
  }

  return {
    rama: "A",
    costePorPaciente: redondear((inversion as number) / pacientes),
    generado,
    retorno: generado !== null ? redondear(generado / (inversion as number)) : null,
    sinPacientes: false,
    entrada: input,
  };
}

/**
 * Lo que le queda a la clínica por cada paciente y al mes.
 *
 * OJO CON EL NOMBRE: esto NO es beneficio. Descuenta lo que cuesta traer al
 * paciente, pero no el material, ni el personal, ni el sillón. Llamarlo
 * beneficio sería mentir, y un dentista lo detecta a la primera. De ahí
 * "deja", que es literal: lo que queda después de publicidad.
 */
export interface Rentabilidad {
  /** Ticket medio menos lo que cuesta traer a ese paciente. */
  dejaPorPaciente: number;
  /** Lo mismo, al mes: generado menos invertido. */
  dejaAlMes: number;
  /** Qué parte del ticket se va en captación. 0,13 = 13 %. */
  pesoCaptacion: number;
}

export function rentabilidad(r: CalcResult): Rentabilidad | null {
  const { ticket, inversion } = r.entrada;
  if (ticket === null || ticket <= 0) return null;
  if (r.costePorPaciente === null || r.generado === null || inversion === null) return null;

  return {
    dejaPorPaciente: redondear(ticket - r.costePorPaciente),
    dejaAlMes: redondear(r.generado - inversion),
    pesoCaptacion: redondear(r.costePorPaciente / ticket),
  };
}

/** Por encima de esto, la captación se está comiendo el ticket. */
const PESO_CAPTACION_ALTO = 0.3;
/**
 * Por debajo de esto el coste ya está tan afinado que prometer bajarlo más
 * sería vender humo. Se sube la inversión y se deja el coste en paz.
 */
const PESO_CAPTACION_AFINADO = 0.1;
/** Recorte alcanzable cuando el coste está disparado: hay mucho que barrer. */
const MEJORA_COSTE_ALTO = 0.2;
/** Recorte alcanzable cuando el coste es razonable pero mejorable. */
const MEJORA_COSTE_MARGEN = 0.1;
/** Subida de inversión que proponemos a quien ya le sale a cuenta. */
const SUBIDA_INVERSION = 0.5;
/** Inversión de arranque para quien todavía no invierte nada. */
const INVERSION_ARRANQUE = 800;
/** Captación sana como parte del ticket, para simular un arranque. */
const CAPTACION_SANA = 0.2;

export interface Proyeccion {
  /**
   * Qué palanca se mueve, que es distinta según de dónde parta la clínica:
   * quien paga de más por cada paciente tiene que abaratar antes de escalar,
   * y quien ya paga poco lo que tiene es margen para invertir más.
   */
  escenario: "bajar-coste" | "subir-inversion" | "empezar";
  inversion: number;
  costePorPaciente: number;
  pacientes: number;
  generado: number;
  /** Contra su situación de hoy. En el arranque, contra cero. */
  inversionExtra: number;
  pacientesExtra: number;
  generadoExtra: number;
  /** Si en este escenario también se afina el coste, para poder decirlo. */
  mejoraCoste: boolean;
  /**
   * El coste ya mejorado por nuestro trabajo pero ANTES de aplicarle el
   * encarecimiento por escalar. Es el que hay que darle al simulador como
   * base: si se le pasara `costePorPaciente`, que ya lleva el escalado
   * dentro, volvería a encarecerlo y las dos cifras dejarían de cuadrar.
   */
  costeSinEscalar: number;
}

/**
 * Qué podría conseguir siendo más eficiente, en plan conservador.
 *
 * Tres reglas, según de dónde parta:
 *
 *   - Captación por encima del 30 % del ticket → está pagando de más por cada
 *     paciente. Se proyecta abaratarlo un 20 % SIN tocar la inversión: el
 *     mismo dinero trae más gente.
 *   - Captación por debajo del 30 % → le sale a cuenta y se está quedando
 *     corto. Se proyecta subir la inversión un 50 % manteniendo el coste.
 *   - No invierte → se simula un arranque con una captación sana sobre su
 *     propio ticket.
 *
 * Devuelve null cuando no hay ticket medio: sin saber lo que vale un paciente,
 * cualquier cifra de facturación proyectada sería inventada, y este producto
 * se vende justo por lo contrario.
 */
export function proyectar(r: CalcResult): Proyeccion | null {
  const { ticket, inversion } = r.entrada;
  if (ticket === null || ticket <= 0) return null;

  // Todavía no invierte: se le enseña qué pasaría si empezara.
  if (inversion === null || inversion <= 0) {
    const coste = redondear(ticket * CAPTACION_SANA);
    const pacientes = Math.floor(INVERSION_ARRANQUE / coste);
    if (pacientes <= 0) return null;
    const generado = redondear(pacientes * ticket);
    return {
      escenario: "empezar",
      inversion: INVERSION_ARRANQUE,
      costePorPaciente: coste,
      pacientes,
      generado,
      inversionExtra: INVERSION_ARRANQUE,
      pacientesExtra: pacientes,
      generadoExtra: generado,
      mejoraCoste: false,
      costeSinEscalar: coste,
    };
  }

  if (r.costePorPaciente === null || r.generado === null || r.entrada.pacientes === null) {
    return null;
  }

  const pesoCaptacion = r.costePorPaciente / ticket;
  const escenario = pesoCaptacion > PESO_CAPTACION_ALTO ? "bajar-coste" : "subir-inversion";

  // El coste se afina siempre que quede margen. Solo se deja intacto cuando
  // ya está tan bajo que prometer bajarlo más sería vender humo.
  const recorte =
    pesoCaptacion > PESO_CAPTACION_ALTO
      ? MEJORA_COSTE_ALTO
      : pesoCaptacion > PESO_CAPTACION_AFINADO
        ? MEJORA_COSTE_MARGEN
        : 0;

  const inversionProyectada =
    escenario === "bajar-coste" ? inversion : redondear(inversion * (1 + SUBIDA_INVERSION));
  const costeMejorado = redondear(r.costePorPaciente * (1 - recorte));

  // La proyección pasa por el MISMO simulador que usa el deslizador, en vez
  // de calcular por su cuenta. Si no, las dos cifras se separan en cuanto el
  // escenario sube la inversión —una aplicaría el encarecimiento al escalar y
  // la otra no— y el usuario vería dos números distintos para el mismo
  // presupuesto. En una pieza que se vende por decir la verdad con los
  // números, esa contradicción se la carga entera.
  const s = simular({
    inversion: inversionProyectada,
    costeBase: costeMejorado,
    inversionBase: inversion,
    ticket,
  });

  const pacientes = s.pacientes;
  const generado = s.generado;
  const costeProyectado = s.costePorPaciente;
  const pacientesExtra = pacientes - r.entrada.pacientes;
  const generadoExtra = redondear(generado - r.generado);

  // Si la proyección no mejora lo que ya tiene, no se enseña. Prometer lo
  // mismo o menos no es prudencia, es ruido.
  if (pacientesExtra <= 0 || generadoExtra <= 0) return null;

  return {
    escenario,
    inversion: inversionProyectada,
    costePorPaciente: costeProyectado,
    pacientes,
    generado,
    inversionExtra: redondear(inversionProyectada - inversion),
    pacientesExtra,
    generadoExtra,
    mejoraCoste: recorte > 0,
    costeSinEscalar: costeMejorado,
  };
}

/**
 * Cuánto encarece la captación cada vez que se dobla la inversión.
 *
 * Escalar publicidad NUNCA sale gratis: al subir el presupuesto se compra
 * tráfico progresivamente peor, y el coste por paciente sube. Un simulador
 * que mantuviera el coste plano prometería que invertir diez veces más trae
 * diez veces más pacientes, que es sencillamente falso — y en un producto
 * que se vende por decir la verdad con los números, sería el peor sitio
 * posible para mentir.
 */
const ENCARECIMIENTO_POR_DOBLE = 0.1;

export interface Simulacion {
  inversion: number;
  costePorPaciente: number;
  pacientes: number;
  generado: number;
  /** Lo generado menos lo invertido. Otra vez: no es beneficio. */
  deja: number;
}

/**
 * Simula un nivel de inversión distinto, para que el usuario pueda jugar.
 *
 * Por debajo de su inversión de partida el coste se deja como está: prometer
 * que gastando menos además saldría más barato es especular.
 */
export function simular(input: {
  inversion: number;
  costeBase: number;
  inversionBase: number;
  ticket: number;
}): Simulacion {
  const { inversion, costeBase, inversionBase, ticket } = input;

  const costePorPaciente =
    inversion > inversionBase && inversionBase > 0
      ? redondear(
          costeBase * (1 + ENCARECIMIENTO_POR_DOBLE * Math.log2(inversion / inversionBase)),
        )
      : costeBase;

  const pacientes = costePorPaciente > 0 ? Math.floor(inversion / costePorPaciente) : 0;
  const generado = redondear(pacientes * ticket);

  return {
    inversion,
    costePorPaciente,
    pacientes,
    generado,
    deja: redondear(generado - inversion),
  };
}

/** Euros en español con separador de miles: 4000 → "4.000,00 €".
 *  A mano y no con toLocaleString porque este repo no depende del ICU del
 *  servidor (mismo motivo que el eur() de puesto-seguro). Vive aquí y no en
 *  cada consumidor porque lo usan tanto el email de seguimiento como el wizard. */
export function formatEur(n: number): string {
  const [entera, decimales] = n.toFixed(2).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conMiles},${decimales} €`;
}

/**
 * Euros para tablas estrechas: sin céntimos a partir de mil.
 *
 * "11.250,00 €" son once caracteres que en un móvil de 390 px parten la celda
 * en dos líneas, y los céntimos de una facturación mensual no le importan a
 * nadie. Por debajo de mil sí se conservan, porque ahí dos decimales son la
 * diferencia entre 33,33 € y 33 € de coste por paciente, que sí se nota.
 */
export function formatEurCompacto(n: number): string {
  if (Math.abs(n) >= 1000) {
    const entera = Math.round(n).toString();
    return `${entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
  }
  return formatEur(n);
}
