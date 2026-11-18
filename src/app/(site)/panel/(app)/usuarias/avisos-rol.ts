import type { Rol } from "@/lib/ventas/dominio";

/** Qué verá cada rol ligado a marca, para avisarlo al elegir la marca. */
export const AVISO_ROL: Partial<Record<Rol, string>> = {
  cliente: "Solo verá Resumen, Tablero, Leads y Tareas de esta marca.",
  agente: "Solo verá las Conversaciones de esta marca, y podrá contestarlas.",
};
