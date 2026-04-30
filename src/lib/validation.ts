import { z } from "zod";

export const contactSchema = z
  .object({
    name: z.string().min(2, "Demasiado corto"),
    email: z.email("Email inválido"),
    company: z.string().optional().default(""),
    message: z.string().min(10, "Mensaje demasiado corto"),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export type ContactInput = z.infer<typeof contactSchema>;
