declare module "gifenc" {
  interface WriteFrameOpts {
    palette?: [number, number, number][] | number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    dispose?: number;
  }
  interface Encoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: WriteFrameOpts,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }
  export function GIFEncoder(opts?: { auto?: boolean }): Encoder;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: unknown,
  ): number[][];
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: string,
  ): Uint8Array;
}
