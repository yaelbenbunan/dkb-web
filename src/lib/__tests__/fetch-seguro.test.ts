import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { fetch as undiciFetch } from "undici";
import { crearAgenteSeguro } from "../fetch-seguro";

describe("crearAgenteSeguro", () => {
  let servidor: http.Server;
  let puerto: number;
  let recibidas = 0;

  beforeAll(async () => {
    servidor = http.createServer((_req, res) => {
      recibidas++;
      res.end("<html>interno</html>");
    });
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    puerto = (servidor.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((r) => servidor.close(() => r())));

  test("una IP interna directa no llega a conectarse (sin DNS no pasa por ssrfLookup)", async () => {
    const agente = crearAgenteSeguro(2000);
    await expect(undiciFetch(`http://127.0.0.1:${puerto}/`, { dispatcher: agente })).rejects.toThrow();
    await agente.close();
    expect(recibidas).toBe(0);
  });
});
