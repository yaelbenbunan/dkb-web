import { sendPreviewFollowup } from "@/lib/preview-followup-action";

export interface FollowupLead {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  style?: string;
  hasLogo: boolean;
  address?: string;
  city?: string;
  currentWebsite?: string;
  featuredDishes: string[];
  valueProp: string;
}

interface Args {
  leadId: string;
  followupToken: string;
  lead: FollowupLead;
}

/** Capture the rendered preview (#preview-capture-root) as a JPEG, then hand
 *  everything to the server action, which sends ONE internal notification
 *  (answers + preview PDF) and the user's offer email.
 *
 *  Always calls the action — even if the capture fails — so the lead is still
 *  notified (just without the PDF). Returns false on any problem.
 *
 *  We inject a temporary stylesheet that forces every node to its final,
 *  fully-visible state — sections animate in on scroll (`whileInView`), so
 *  off-screen ones would otherwise capture blank. */
/** Resolve once every <img> inside `root` has finished loading (or errored),
 *  so the capture never fotographs half-loaded photos. Bounded by `timeoutMs`
 *  so a single stuck image can't block the whole flow. */
async function waitForImages(root: HTMLElement, timeoutMs: number): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  const pending = imgs
    .filter((img) => !(img.complete && img.naturalWidth > 0))
    .map(
      (img) =>
        new Promise<void>((res) => {
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        }),
    );
  const decoded = imgs.map((img) =>
    typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve(),
  );
  const all = Promise.all([...pending, ...decoded]).then(() => undefined);
  await Promise.race([
    all,
    new Promise<void>((r) => setTimeout(r, timeoutMs)),
  ]);
}

/** Scroll the window through the full page so every Motion `whileInView`
 *  section fires its entrance animation (they use `once: true`, so they stay
 *  visible afterwards). WITHOUT this, sections still off-screen at capture time
 *  render BLANK — the CSS opacity override isn't enough because Motion drives
 *  those styles imperatively via JS. Restores the scroll position when done. */
async function triggerInViewAnimations(): Promise<void> {
  const startY = window.scrollY;
  const total = document.documentElement.scrollHeight;
  const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
  for (let y = 0; y <= total; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 130));
  }
  window.scrollTo(0, startY);
  // Let the freshly-triggered entrance animations finish before freezing.
  await new Promise((r) => setTimeout(r, 650));
}

export async function captureAndSendFollowup(args: Args): Promise<boolean> {
  let imageDataUrl = "";
  const node = document.getElementById("preview-capture-root");
  if (node) {
    const el = node as HTMLElement;
    let style: HTMLStyleElement | null = null;
    try {
      // 1) Wait for web fonts — otherwise the capture renders with fallback
      //    typography and looks nothing like the live template.
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        /* no-op: FontFaceSet unsupported */
      }
      // 2) Wait for every image (dish/team photos, logo, hero) to finish.
      await waitForImages(el, 7000);
      // 3) Trigger every on-scroll section so nothing captures blank.
      await triggerInViewAnimations();
      // 4) Freeze the final state: force everything visible and kill the
      //    scale()/transitions so html-to-image captures at full size.
      style = document.createElement("style");
      style.textContent =
        "#preview-capture-root,#preview-capture-root *{opacity:1 !important;" +
        "transform:none !important;animation:none !important;" +
        "transition:none !important;filter:none !important;}";
      document.head.appendChild(style);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => setTimeout(r, 250));

      const { toJpeg } = await import("html-to-image");
      const opts = {
        quality: 0.85,
        pixelRatio: 1.3,
        backgroundColor: "#ffffff",
        width: el.scrollWidth,
        height: el.scrollHeight,
        cacheBust: true,
      };
      // 5) html-to-image's first pass routinely misses fonts/images while it
      //    builds its internal cache; the second pass is the reliable one.
      //    Warm up (discarded), then capture for real.
      try {
        await toJpeg(el, opts);
      } catch {
        /* warm-up errors are non-fatal */
      }
      await new Promise((r) => setTimeout(r, 150));
      const url = await toJpeg(el, opts);
      if (url && url.length > 5000) imageDataUrl = url;
    } catch (err) {
      console.error("preview capture failed (sending without PDF):", err);
    } finally {
      style?.remove();
    }
  }

  try {
    const { lead } = args;
    const fd = new FormData();
    fd.set("leadId", args.leadId);
    fd.set("followupToken", args.followupToken);
    fd.set("name", lead.name);
    fd.set("email", lead.email);
    fd.set("phone", lead.phone);
    fd.set("businessName", lead.businessName);
    fd.set("businessType", lead.businessType);
    if (lead.ecommerceKind) fd.set("ecommerceKind", lead.ecommerceKind);
    fd.set("sector", lead.sector);
    fd.set("offerings", JSON.stringify(lead.offerings));
    fd.set("palette", lead.palette);
    fd.set("typography", lead.typography);
    if (lead.style) fd.set("style", lead.style);
    fd.set("hasLogo", lead.hasLogo ? "true" : "false");
    if (lead.address) fd.set("address", lead.address);
    if (lead.city) fd.set("city", lead.city);
    if (lead.currentWebsite) fd.set("currentWebsite", lead.currentWebsite);
    fd.set("featuredDishes", JSON.stringify(lead.featuredDishes));
    fd.set("valueProp", lead.valueProp);
    fd.set("imageDataUrl", imageDataUrl);

    const r = await sendPreviewFollowup(fd);
    return r.ok;
  } catch (err) {
    console.error("captureAndSendFollowup failed:", err);
    return false;
  }
}
