import type { Metadata } from "next";
import { Web299LandingPage } from "@/components/web-299/Web299Landing";
import {
  WEB_299_META_DESCRIPTION,
  WEB_299_META_TITLE,
  WEB_299_PATH,
} from "@/lib/web-299";

export const metadata: Metadata = {
  title: WEB_299_META_TITLE,
  description: WEB_299_META_DESCRIPTION,
  alternates: { canonical: WEB_299_PATH },
  openGraph: {
    type: "website",
    url: WEB_299_PATH,
    title: WEB_299_META_TITLE,
    description: WEB_299_META_DESCRIPTION,
    siteName: "dinkbit",
  },
};

export default function Web299Page() {
  return <Web299LandingPage />;
}
