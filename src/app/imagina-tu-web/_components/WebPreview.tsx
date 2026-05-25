// src/app/imagina-tu-web/_components/WebPreview.tsx
"use client";

import type { CopyResponse } from "@/lib/preview-validation";
import {
  InformativaTemplate,
  type InformativaData,
} from "./templates/InformativaTemplate";
import {
  EcommerceTemplate,
  type EcommerceData,
} from "./templates/EcommerceTemplate";

export interface WebPreviewData {
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: "productos" | "servicios";
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
}

interface Props {
  data: WebPreviewData;
  copy: CopyResponse | null;
  heroImageDataUrl: string | null;
}

export function WebPreview({ data, copy, heroImageDataUrl }: Props) {
  const isEcom = data.businessType === "ecommerce";
  const safeName = data.businessName.toLowerCase().replace(/\s+/g, "");

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-4 py-2.5">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-yellow-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-fg-muted">{safeName}.es</span>
      </div>

      {isEcom ? (
        <EcommerceTemplate
          data={data as EcommerceData}
          copy={copy}
          heroImageDataUrl={heroImageDataUrl}
        />
      ) : (
        <InformativaTemplate
          data={data as InformativaData}
          copy={copy}
          heroImageDataUrl={heroImageDataUrl}
        />
      )}
    </div>
  );
}
