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
