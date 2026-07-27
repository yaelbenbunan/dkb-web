import { describe, expect, test } from "vitest";
import { BUILTIN_TEMPLATES } from "../campaign-templates-builtin";
import { blocksSchema } from "../campaign-blocks";

describe("campaign-templates-builtin", () => {
  test("hay exactamente 2 plantillas base", () => {
    expect(BUILTIN_TEMPLATES).toHaveLength(2);
  });

  test("cada plantilla base tiene bloques válidos", () => {
    BUILTIN_TEMPLATES.forEach((template) => {
      const result = blocksSchema.safeParse(template.blocks);
      expect(result.success).toBe(true);
    });
  });

  test("cada plantilla tiene id, name, description e is_builtin", () => {
    BUILTIN_TEMPLATES.forEach((template) => {
      expect(template.id).toBeDefined();
      expect(typeof template.id).toBe("string");
      expect(template.name).toBeDefined();
      expect(typeof template.name).toBe("string");
      expect(template.description).toBeDefined();
      expect(typeof template.description).toBe("string");
      expect(template.is_builtin).toBe(true);
    });
  });
});
