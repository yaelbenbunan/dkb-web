import { sendPreviewFollowup } from "@/lib/preview-followup-action";

interface Args {
  leadId: string;
  followupToken: string;
  name: string;
  email: string;
  businessName: string;
}

/** Capture the rendered preview (#preview-capture-root) as a JPEG and hand it
 *  to the server action, which turns it into a PDF and sends the offer +
 *  internal emails. Best-effort: returns false on any problem without throwing.
 *
 *  We inject a temporary stylesheet that forces every node to its final,
 *  fully-visible state — the templates animate sections in on scroll
 *  (`whileInView`), so off-screen sections would otherwise capture blank. */
export async function captureAndSendFollowup(args: Args): Promise<boolean> {
  const node = document.getElementById("preview-capture-root");
  if (!node) return false;

  const style = document.createElement("style");
  style.textContent =
    "#preview-capture-root,#preview-capture-root *{opacity:1 !important;" +
    "transform:none !important;animation:none !important;" +
    "transition:none !important;filter:none !important;}";
  document.head.appendChild(style);

  try {
    // Let the override apply and layout settle before measuring/cloning.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 150));

    const { toJpeg } = await import("html-to-image");
    const el = node as HTMLElement;
    const dataUrl = await toJpeg(el, {
      quality: 0.82,
      pixelRatio: 1.3,
      backgroundColor: "#ffffff",
      width: el.scrollWidth,
      height: el.scrollHeight,
      cacheBust: true,
    });
    if (!dataUrl || dataUrl.length < 5000) return false;

    const fd = new FormData();
    fd.set("leadId", args.leadId);
    fd.set("followupToken", args.followupToken);
    fd.set("name", args.name);
    fd.set("email", args.email);
    fd.set("businessName", args.businessName);
    fd.set("imageDataUrl", dataUrl);

    const r = await sendPreviewFollowup(fd);
    return r.ok;
  } catch (err) {
    console.error("captureAndSendFollowup failed:", err);
    return false;
  } finally {
    style.remove();
  }
}
