import type { MetadataRoute } from "next";

/**
 * Los rastreadores de los buscadores con IA, nombrados uno a uno.
 *
 * Con `userAgent: "*"` ya entraban todos, así que esto NO desbloquea nada: lo
 * que hace es dejar la intención por escrito. Un `Disallow` genérico añadido con
 * prisa el día que alguien quiera tapar una ruta se los llevaría por delante sin
 * que nadie lo note hasta meses después, cuando ya no apareces en ninguna
 * respuesta. Con una regla propia por bot, ese accidente no ocurre en silencio.
 *
 * Los que importan hoy:
 * - GPTBot indexa para el entrenamiento de OpenAI; OAI-SearchBot es el que
 *   consulta la web EN CALIENTE cuando alguien pregunta en ChatGPT. Son dos
 *   agentes distintos y bloquear el segundo te saca de las respuestas.
 * - ClaudeBot y anthropic-ai (Anthropic), PerplexityBot (Perplexity).
 * - Google-Extended no rastrea: es el interruptor que decide si lo que ya tiene
 *   Google puede usarse en Gemini y en los resúmenes de IA. Va aparte de
 *   Googlebot a propósito.
 * - Applebot-Extended hace lo mismo para Apple Intelligence.
 */
const BOTS_DE_IA = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
];

// `/imagina-tu-web` es una herramienta interactiva que genera previews con IA:
// ya lleva `robots: { index: false }` en su metadata y aquí se refuerza para no
// gastar rastreo en ella. `/api/` no tiene nada que indexar.
const SIN_INTERES = ["/imagina-tu-web", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: SIN_INTERES },
      ...BOTS_DE_IA.map((userAgent) => ({ userAgent, allow: "/", disallow: SIN_INTERES })),
    ],
    sitemap: "https://www.dinkbit.es/sitemap.xml",
  };
}
