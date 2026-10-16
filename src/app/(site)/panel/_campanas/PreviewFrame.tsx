"use client";

import { useMemo } from "react";
import { renderCampaignEmail } from "@/lib/campaign-render";
import type { Block, CampaignStyle } from "@/lib/campaign-blocks";

export function PreviewFrame({
  blocks,
  style,
  preheader,
}: {
  blocks: Block[];
  style: CampaignStyle;
  /** Texto previo escrito en el panel. Vacío = el render cae a la primera
   *  línea del correo, igual que hará el envío real. */
  preheader: string;
}) {
  const html = useMemo(() => {
    return renderCampaignEmail(blocks, style, {
      preheader,
      unsubscribeUrl: "#preview",
    }).html;
  }, [blocks, style, preheader]);

  return (
    <iframe
      sandbox=""
      srcDoc={html}
      style={{
        width: "100%",
        height: "70vh",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
      }}
      title="Previsualización"
    />
  );
}
