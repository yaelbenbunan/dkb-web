"use client";

import { createContext, useContext } from "react";

type Resultado = { ok: boolean; error?: string };

/**
 * Lo que el asistente de campañas necesita del servidor. Las pantallas son las
 * mismas en el /panel viejo y en /panel/ventas/<marca>/campanas; cambia quién
 * las sirve: el /panel viejo pasa sus server actions de siempre, y ventas
 * unas que comprueban la marca, el permiso y el módulo antes de cada cosa.
 */
export interface AccionesCampana {
  /** Lista de campañas: `/panel/campanas` o `/panel/ventas/<slug>/campanas`. */
  rutaBase: string;
  /** Remitentes que puede elegir esta marca; el primero es el de por defecto. */
  remitentes: string[];
  crearBorrador: () => Promise<{ id: string } | { error: string }>;
  generar: (campaignId: string, concept: string, refs: string, templateId?: string) => Promise<Resultado>;
  editar: (campaignId: string, instruction: string) => Promise<Resultado>;
  guardarBloques: (campaignId: string, blocksJson: string) => Promise<Resultado>;
  guardarComoPlantilla: (campaignId: string, name: string, description: string) => Promise<Resultado>;
  guardarDatos: (
    campaignId: string,
    name: string,
    subject: string,
    fromEmail: string,
    fromName?: string,
    preheader?: string,
  ) => Promise<Resultado>;
  enviarPrueba: (campaignId: string, toEmails: string) => Promise<Resultado>;
  enviar: (campaignId: string, leadIdsCsv: string) => Promise<{ ok: boolean; sent?: number; skipped?: number; error?: string }>;
  programar: (campaignId: string, leadIdsCsv: string, scheduledAtIso: string) => Promise<Resultado>;
  cancelarProgramacion: (campaignId: string) => Promise<Resultado>;
  subirImagen: (formData: FormData) => Promise<{ ok: boolean; url?: string; error?: string }>;
}

const Contexto = createContext<AccionesCampana | null>(null);

export function ProveedorAccionesCampana({ acciones, children }: { acciones: AccionesCampana; children: React.ReactNode }) {
  return <Contexto.Provider value={acciones}>{children}</Contexto.Provider>;
}

export function useAccionesCampana(): AccionesCampana {
  const acciones = useContext(Contexto);
  if (!acciones) throw new Error("Falta <ProveedorAccionesCampana> alrededor del asistente de campañas.");
  return acciones;
}
