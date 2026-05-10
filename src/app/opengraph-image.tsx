import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "dinkbit — agencia digital";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
            "radial-gradient(circle at 20% 20%, #1e3a8a 0%, #0b0f1a 60%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#187bef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            d
          </div>
          dinkbit
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0 0.28em",
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            <span>Soluciones</span>
            <span>digitales</span>
            <span style={{ color: "#187bef" }}>end-to-end</span>
            <span>para</span>
            <span>marcas</span>
            <span>que</span>
            <span>quieren</span>
            <span>crecer.</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            Desarrollo web · Ecommerce · Paid media · SEO
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
