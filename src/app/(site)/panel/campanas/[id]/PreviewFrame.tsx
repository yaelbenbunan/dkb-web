"use client";

import { useMemo } from "react";
import { renderCampaignEmail } from "@/lib/campaign-render";
import type { Block, CampaignStyle } from "@/lib/campaign-blocks";

export function PreviewFrame({
  blocks,
  style,
  subject,
}: {
  blocks: Block[];
  style: CampaignStyle;
  subject: string;
}) {
  const html = useMemo(() => {
    return renderCampaignEmail(blocks, style, {
      preheader: subject,
      unsubscribeUrl: "#preview",
    }).html;
  }, [blocks, style, subject]);

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
