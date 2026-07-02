// Captura de campañas (UTMs) del tráfico entrante para atribuir cada lead a su
// canal/campaña reales. Se guardan en sessionStorage (primer toque de la visita)
// y se leen al enviar cualquier formulario. No usa cookies → sin implicaciones
// de consentimiento; persiste durante la navegación de la misma pestaña, que es
// el flujo típico: clic en anuncio → landing → formulario.

const KEY = "dkb_utm";

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

// Lee las UTMs (y clics de anuncios) de la URL actual y las persiste una sola
// vez por visita. Si Google Ads auto-etiqueta con gclid/gbraid/wbraid (sin utm),
// se infiere igualmente el origen de Google Ads.
export function captureUtms(): void {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  for (const k of ["source", "medium", "campaign", "term", "content"] as const) {
    const v = q.get(`utm_${k}`);
    if (v && v.trim()) utm[k] = v.trim().slice(0, 120);
  }
  const hasGoogleClick = q.has("gclid") || q.has("gbraid") || q.has("wbraid");
  const hasMetaClick = q.has("fbclid");
  if (!Object.keys(utm).length && !hasGoogleClick && !hasMetaClick) return;
  if (!utm.source && hasGoogleClick) utm.source = "google";
  if (!utm.source && hasMetaClick) utm.source = "meta";
  if (!utm.medium && (hasGoogleClick || hasMetaClick)) utm.medium = "cpc";
  try {
    // Primer toque: no sobrescribir una atribución ya capturada en la visita.
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, JSON.stringify(utm));
    }
  } catch {
    /* sessionStorage no disponible (modo privado, etc.) — se ignora */
  }
}

export function readUtms(): Utm {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") as Utm;
  } catch {
    return {};
  }
}

// Añade las UTMs guardadas a un FormData antes de enviarlo (helper para los
// formularios). Solo escribe los campos presentes.
export function appendUtms(fd: FormData): void {
  const utm = readUtms();
  if (utm.source) fd.set("utm_source", utm.source);
  if (utm.medium) fd.set("utm_medium", utm.medium);
  if (utm.campaign) fd.set("utm_campaign", utm.campaign);
  if (utm.term) fd.set("utm_term", utm.term);
  if (utm.content) fd.set("utm_content", utm.content);
}
