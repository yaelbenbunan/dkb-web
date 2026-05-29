// src/app/imagina-tu-web/_components/WebPreview.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  CopyResponse,
  SectorInformativaCopyResponse,
} from "@/lib/preview-validation";
import {
  InformativaTemplate,
  type InformativaData,
} from "./templates/InformativaTemplate";
import {
  EcommerceTemplate,
  type EcommerceData,
} from "./templates/EcommerceTemplate";
import {
  InformativaSectorTemplate,
  type InformativaSectorData,
} from "./templates/InformativaSectorTemplate";
import {
  EditorialLimpioTemplate,
  type EditorialLimpioData,
} from "./templates/EditorialLimpioTemplate";
import { isSupportedSector, type Cuisine } from "./templates/sector-assets";
import type { CustomPaletteColors } from "@/lib/preview-themes";
import type { PreviewStyle } from "@/lib/preview-validation";

export interface WebPreviewData {
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: "productos" | "servicios";
  businessName: string;
  sector: string;
  offerings: string[];
  /** Only when sector === "restauracion" */
  cuisine?: Cuisine | "";
  palette: string;
  /** Present only when palette === CUSTOM_PALETTE_SLUG */
  customColors?: CustomPaletteColors;
  typography: string;
  /** Visual style picked in StepStyle. Defaults to "moderno" for older flows. */
  style?: PreviewStyle;
  valueProp: string;
  logoDataUrl?: string;
  address?: string;
  city?: string;
}

interface Props {
  data: WebPreviewData;
  copy: CopyResponse | null;
  sectorCopy: SectorInformativaCopyResponse | null;
  heroImageDataUrl: string | null;
}

const DESKTOP_WIDTH = 1280;

export function WebPreview({ data, copy, sectorCopy, heroImageDataUrl }: Props) {
  const isEcom = data.businessType === "ecommerce";
  // Sector-specific template applies to all `Informativa` businesses whose
  // sector has assets defined (currently every sector EXCEPT restauración).
  const useSectorTemplate =
    data.businessType === "informativa" && isSupportedSector(data.sector);
  const safeName = data.businessName.toLowerCase().replace(/\s+/g, "");

  // Smart layout:
  // - Wide viewport (>= DESKTOP_WIDTH): inner fills the container at scale 1
  //   so the template renders at its natural size (no empty side gutters).
  // - Narrow viewport (< DESKTOP_WIDTH): inner stays at DESKTOP_WIDTH and
  //   gets scaled down to fit. This preserves the desktop layout regardless
  //   of the user's screen width.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerWidth, setInnerWidth] = useState<number | "100%">("100%");
  const [scaledHeight, setScaledHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const update = () => {
      const w = wrapperRef.current?.clientWidth ?? DESKTOP_WIDTH;
      const wide = w >= DESKTOP_WIDTH;
      const nextScale = wide ? 1 : w / DESKTOP_WIDTH;
      const nextInner: number | "100%" = wide ? "100%" : DESKTOP_WIDTH;
      setScale(nextScale);
      setInnerWidth(nextInner);
      const h = innerRef.current?.offsetHeight ?? 0;
      setScaledHeight(h ? h * nextScale : "auto");
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const h = innerRef.current?.offsetHeight ?? 0;
    if (h) setScaledHeight(h * scale);
  }, [copy, sectorCopy, heroImageDataUrl, scale]);

  return (
    <div className="overflow-hidden border-y border-border">
      {/* Browser chrome — kept as a contextual indicator that this is a preview */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-4 py-2.5">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-yellow-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-fg-muted">{safeName}.es</span>
      </div>

      <div ref={wrapperRef} style={{ height: scaledHeight, overflow: "hidden" }}>
        <div
          ref={innerRef}
          style={{
            width: innerWidth,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          {useSectorTemplate ? (
            data.style === "editorial" ? (
              <EditorialLimpioTemplate
                data={data as EditorialLimpioData}
                copy={sectorCopy}
              />
            ) : (
              <InformativaSectorTemplate
                data={data as InformativaSectorData}
                copy={sectorCopy}
              />
            )
          ) : isEcom ? (
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
      </div>
    </div>
  );
}
