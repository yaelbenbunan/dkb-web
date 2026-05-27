import { ImageResponse } from "next/og";
import { getServiceBySlug } from "@/lib/content";

export const runtime = "nodejs";
export const alt = "Servicio — dinkbit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ServiceOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  const title = service?.heroTitle ?? service?.title ?? "Servicio";
  const subtitle =
    service?.heroSubtitle ?? service?.shortDescription ?? "";
  const tag = service?.title ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "radial-gradient(circle at 20% 30%, #1e3a8a 0%, #0b0f1a 60%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#187bef",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              d
            </div>
            dinkbit
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontWeight: 700,
            }}
          >
            Servicio
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {tag && (
            <div
              style={{
                fontSize: 24,
                color: "#187bef",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontWeight: 800,
              }}
            >
              {tag}
            </div>
          )}
          <div
            style={{
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 30,
                color: "#cbd5e1",
                fontWeight: 500,
                maxWidth: 1000,
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 22,
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          dinkbit.es — agencia digital en Madrid y México
        </div>
      </div>
    ),
    { ...size },
  );
}
