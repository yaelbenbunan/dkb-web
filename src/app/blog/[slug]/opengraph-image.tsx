import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/content";

export const runtime = "nodejs";
export const alt = "Artículo del blog dinkbit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function PostOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const title = post?.title ?? "Artículo del blog";
  const tag = post?.tags?.[0] ?? "";
  const author = post?.author.name ?? "dinkbit";

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
            "radial-gradient(circle at 80% 20%, #3a90f2 0%, #0c1c40 45%, #07091f 80%)",
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
            dinkbit · blog
          </div>
          {tag && (
            <div
              style={{
                fontSize: 18,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                fontWeight: 800,
                background: "rgba(255,255,255,0.12)",
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {tag.replace(/-/g, " ")}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#cbd5e1",
            fontWeight: 600,
          }}
        >
          <div>Por {author}</div>
          <div>www.dinkbit.es/blog</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
