import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verificarFirmaMeta } from "../firma";

const SECRETO = "secreto-de-prueba";
const CUERPO = '{"object":"whatsapp_business_account","entry":[]}';
const firmaDe = (cuerpo: string, secreto = SECRETO) =>
  `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`;

describe("verificarFirmaMeta", () => {
  it("acepta una firma correcta", () => {
    expect(verificarFirmaMeta(SECRETO, firmaDe(CUERPO), CUERPO)).toBe(true);
  });

  it("rechaza si el cuerpo fue alterado", () => {
    expect(verificarFirmaMeta(SECRETO, firmaDe(CUERPO), CUERPO + " ")).toBe(false);
  });

  it("rechaza una firma hecha con otro secreto", () => {
    expect(verificarFirmaMeta(SECRETO, firmaDe(CUERPO, "otro"), CUERPO)).toBe(false);
  });

  it("rechaza cabecera ausente o con formato raro", () => {
    expect(verificarFirmaMeta(SECRETO, null, CUERPO)).toBe(false);
    expect(verificarFirmaMeta(SECRETO, "sha1=abc", CUERPO)).toBe(false);
    expect(verificarFirmaMeta(SECRETO, "sha256=nohex", CUERPO)).toBe(false);
  });
});
