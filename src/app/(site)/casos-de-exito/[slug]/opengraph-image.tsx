import { ImageResponse } from "next/og";
import { getCaseStudyBySlug } from "@/lib/content";

export const runtime = "nodejs";
export const alt = "Caso de éxito — dinkbit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CaseOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCaseStudyBySlug(slug);

  const title = c?.title ?? "Caso de éxito";
  const client = c?.client ?? "";
  const metric = c?.metricHeadline;
  const tags = (c?.tags ?? []).slice(0, 4);

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
            "radial-gradient(circle at 80% 20%, #1e3a8a 0%, #0b0f1a 60%)",
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
            Caso de éxito
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {client && (
            <div
              style={{
                fontSize: 24,
                color: "#187bef",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontWeight: 800,
              }}
            >
              {client}
            </div>
          )}
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {metric && (
            <div
              style={{
                fontSize: 32,
                color: "#e2e8f0",
                fontWeight: 600,
                maxWidth: 1000,
              }}
            >
              {metric}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {tags.map((t) => (
            <div
              key={t}
              style={{
                fontSize: 18,
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.3)",
                color: "#cbd5e1",
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
