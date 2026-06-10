"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sendPreviewRating } from "@/lib/preview-rating-action";
import { track } from "@/lib/gtm";
import type { WebPreviewData } from "./WebPreview";

interface Props {
  leadId: string;
  contact: { name: string; email: string; phone: string };
  data: WebPreviewData;
}

type Phase = "ask" | "comment" | "done";

export function RatingBar({ leadId, contact, data }: Props) {
  const [phase, setPhase] = useState<Phase>("ask");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (chosen: "up" | "down", finalComment: string) => {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("rating", chosen);
    fd.set("comment", finalComment);
    fd.set("name", contact.name);
    fd.set("email", contact.email);
    fd.set("phone", contact.phone);
    fd.set("businessType", data.businessType);
    if (data.ecommerceKind) fd.set("ecommerceKind", data.ecommerceKind);
    fd.set("businessName", data.businessName);
    fd.set("sector", data.sector);
    fd.set("offerings", JSON.stringify(data.offerings));
    fd.set("palette", data.palette);
    fd.set("typography", data.typography);
    fd.set("valueProp", data.valueProp);

    startTransition(async () => {
      const r = await sendPreviewRating(fd);
      if (r.ok) {
        track("preview_rating", { leadId, rating: chosen });
        setPhase("done");
      } else {
        setError(r.error ?? "No se pudo enviar.");
      }
    });
  };

  const handleVote = (v: "up" | "down") => {
    setRating(v);
    setPhase("comment");
  };

  return (
    <div className="sticky bottom-4 mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-bg-elevated p-5 shadow-2xl">
      {phase === "ask" && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-base font-semibold">¿Qué te parece el preview?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleVote("up")}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/25"
            >
              <span className="text-xl">👍</span> Me gusta
            </button>
            <button
              type="button"
              onClick={() => handleVote("down")}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-red-500/15 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/25"
            >
              <span className="text-xl">👎</span> Mejorable
            </button>
          </div>
        </div>
      )}

      {phase === "comment" && rating && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            {rating === "up"
              ? "¡Genial! ¿Algo que destacarías? (opcional)"
              : "Vaya. ¿Qué cambiarías? (opcional)"}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Escribe aquí…"
            className="surface-input block w-full resize-none rounded-md px-3 py-2 text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => submit(rating, "")}
              disabled={pending}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-bg-subtle disabled:opacity-50"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={() => submit(rating, comment.trim())}
              disabled={pending}
              className="h-10 rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar feedback"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-base font-semibold text-emerald-400">
              ¡Gracias por tu feedback!
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Si quieres dar el siguiente paso, hablemos.
            </p>
          </div>
          <Link
            href="/contacto?servicio=Desarrollo%20web"
            onClick={() => track("preview_cta_click", { leadId })}
            className="inline-flex h-11 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-white shadow-md hover:bg-accent-hover"
          >
            Quiero mi web de verdad →
          </Link>
        </div>
      )}
    </div>
  );
}
