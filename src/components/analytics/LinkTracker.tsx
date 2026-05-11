"use client";

import { useEffect } from "react";
import { track } from "@/lib/gtm";

type LinkKind = "phone_call" | "email_click" | "whatsapp_click";

function classifyHref(href: string): LinkKind | null {
  if (href.startsWith("tel:")) return "phone_call";
  if (href.startsWith("mailto:")) return "email_click";
  if (href.includes("wa.me") || href.includes("api.whatsapp.com")) {
    return "whatsapp_click";
  }
  return null;
}

function locationFor(a: HTMLAnchorElement): "header" | "footer" | "page" {
  const region = a.closest("header,footer");
  if (region?.tagName === "HEADER") return "header";
  if (region?.tagName === "FOOTER") return "footer";
  return "page";
}

export function LinkTracker() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const a = target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const kind = classifyHref(href);
      if (!kind) return;
      track(kind, {
        link_location: locationFor(a),
        link_url: href,
      });
    };
    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, []);

  return null;
}
