import "@testing-library/jest-dom/vitest";

// jsdom no implementa IntersectionObserver, y framer-motion lo necesita para
// `whileInView` (lo usa <Reveal />). Sin este stub, cualquier test que renderice
// un componente con reveal peta al montar.
if (!("IntersectionObserver" in globalThis)) {
  class IntersectionObserverStub implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}

// El entorno jsdom de Vitest no expone `localStorage` ni `sessionStorage` como
// globales (ni siquiera en `window`), aunque jsdom sí los implementa. Sin esto,
// cualquier test que toque almacenamiento revienta con «Cannot read properties
// of undefined». Se toman prestados de una instancia real de jsdom en vez de
// escribir un doble: así el comportamiento —claves como cadenas, `length`,
// `clear()`— es el de verdad y no el que nos imaginemos.
// Ojo: la clave existe en `globalThis` aunque su valor sea `undefined`, así que
// hay que mirar el valor y no usar `in`.
if (typeof (globalThis as { localStorage?: Storage }).localStorage === "undefined") {
  const { JSDOM } = await import("jsdom");
  const prestada = new JSDOM("", { url: "http://localhost:3000/" }).window;
  for (const clave of ["localStorage", "sessionStorage"] as const) {
    const almacen = prestada[clave];
    Object.defineProperty(globalThis, clave, { value: almacen, configurable: true, writable: true });
    if (typeof window !== "undefined") {
      Object.defineProperty(window, clave, { value: almacen, configurable: true, writable: true });
    }
  }
}
