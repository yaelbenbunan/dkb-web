"use client";

import { useEffect } from "react";
import { captureUtms } from "@/lib/utm";

// Captura las UTMs / clics de anuncio de la URL de entrada al cargar el sitio,
// para atribuir después el lead a su canal y campaña. Independiente del banner
// de cookies (usa sessionStorage, no cookies).
export function UtmCapture() {
  useEffect(() => {
    captureUtms();
  }, []);
  return null;
}
