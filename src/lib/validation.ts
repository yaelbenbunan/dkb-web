import { z } from "zod";

export const contactSchema = z
  .object({
    name: z.string().min(2, "Demasiado corto"),
    email: z.email("Email inválido"),
    phone: z.string().min(6, "Teléfono demasiado corto"),
    service: z.string().min(1, "Selecciona un servicio"),
    source: z.string().min(1, "Indícanos cómo nos has conocido"),
    message: z.string().min(5, "Mensaje demasiado corto"),
    privacy: z.literal("on", { message: "Debes aceptar la política de privacidad" }),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactFieldName =
  | "name"
  | "email"
  | "phone"
  | "service"
  | "source"
  | "message"
  | "privacy";

export type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;

export interface ContactActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: ContactFieldErrors;
}

const FIELD_KEYS: ContactFieldName[] = [
  "name",
  "email",
  "phone",
  "service",
  "source",
  "message",
  "privacy",
];

export function isContactFieldName(key: unknown): key is ContactFieldName {
  return typeof key === "string" && (FIELD_KEYS as string[]).includes(key);
}
