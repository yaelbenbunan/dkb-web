import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({});

const config: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  images: {
    // Allow next/image to render local SVGs (partner logos).
    // CSP below restricts inline scripts/styles inside SVG to prevent XSS.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withMDX(config);
