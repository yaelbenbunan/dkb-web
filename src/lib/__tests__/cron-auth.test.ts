import { describe, expect, test } from "vitest";
import { isAuthorizedCronRequest } from "../cron-auth";

describe("isAuthorizedCronRequest", () => {
  test("acepta el Bearer exacto", () => {
    expect(isAuthorizedCronRequest("Bearer s3cret", "s3cret")).toBe(true);
  });

  test("rechaza otro secreto, sin cabecera o sin secreto configurado", () => {
    expect(isAuthorizedCronRequest("Bearer otro", "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest(null, "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
  });
});
