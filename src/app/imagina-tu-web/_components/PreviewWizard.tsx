"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendPreviewLead } from "@/lib/preview-lead-action";
import { track, pushUserData } from "@/lib/gtm";
import { StepBusinessType } from "./steps/StepBusinessType";
import { StepIdentity } from "./steps/StepIdentity";
import { StepOfferings } from "./steps/StepOfferings";
import { StepPalette } from "./steps/StepPalette";
import { StepTypography } from "./steps/StepTypography";
import { StepStyle } from "./steps/StepStyle";
import { StepBranding } from "./steps/StepBranding";
import { StepFinal } from "./steps/StepFinal";
import { WebPreview, type WebPreviewData } from "./WebPreview";
import { RatingBar } from "./RatingBar";
import { generatePreview } from "@/lib/preview-generate-action";
import { captureAndSendFollowup } from "./capture-and-send";
import { PreviewLoading } from "./PreviewLoading";
import {
  isValidContactEmail,
  isValidContactPhone,
  type CopyResponse,
  type PreviewStyle,
  type SectorInformativaCopyResponse,
} from "@/lib/preview-validation";
import type { CustomPaletteColors } from "@/lib/preview-themes";
import type { Cuisine } from "./templates/sector-assets";

interface WizardState {
  businessType: "informativa" | "ecommerce" | null;
  ecommerceKind: "productos" | "servicios" | null;
  businessName: string;
  sector: string;
  /** Optional URL of the business's current website (used to ground the copy). */
  currentWebsite: string;
  offerings: string[];
  /** Set only when `sector === "restauracion"` */
  cuisine: Cuisine | "";
  /** Optional signature dishes (restauración only). */
  featuredDishes: string[];
  palette: string;
  /** Set only when `palette === CUSTOM_PALETTE_SLUG` */
  customColors: CustomPaletteColors | null;
  typography: string;
  style: PreviewStyle | "";
  logoDataUrl: string;
  address: string;
  city: string;
  valueProp: string;
  name: string;
  email: string;
  phone: string;
  privacy: boolean;
  website: string;
}

const INITIAL: WizardState = {
  businessType: null,
  ecommerceKind: null,
  businessName: "",
  sector: "",
  currentWebsite: "",
  offerings: [],
  cuisine: "",
  featuredDishes: [],
  palette: "",
  customColors: null,
  typography: "",
  style: "",
  logoDataUrl: "",
  address: "",
  city: "",
  valueProp: "",
  name: "",
  email: "",
  phone: "",
  privacy: false,
  website: "",
};

const TOTAL_STEPS = 8;

export function PreviewWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [followupToken, setFollowupToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{
    copy: CopyResponse | null;
    sectorCopy: SectorInformativaCopyResponse | null;
    heroImageDataUrl: string | null;
    sourceImageUrl: string | null;
  } | null>(null);
  const loadedAt = useRef(Date.now());
  const wizardRef = useRef<HTMLDivElement>(null);
  const followupSentRef = useRef(false);

  useEffect(() => {
    loadedAt.current = Date.now();
    track("preview_wizard_start");
  }, []);

  // On step change, scroll back to the start of the wizard so the new
  // question's heading is visible. Without this, mobile users land in
  // the middle of the next step because the "Siguiente" button was at
  // the bottom of the previous one.
  useEffect(() => {
    wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // When the preview lead is created, scroll to the very top of the page
  // so the user sees the simulated web from its header — not mid-page
  // where the form was.
  useEffect(() => {
    if (leadId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [leadId]);

  // Once the preview is fully rendered, capture it to a PDF and fire the
  // follow-up emails (offer to the user + copy to us). Runs exactly once, and
  // only after generation settles so the capture isn't blank. Best-effort.
  useEffect(() => {
    if (followupSentRef.current) return;
    if (!leadId || !followupToken || generating || !generated) return;
    followupSentRef.current = true;
    const t = setTimeout(() => {
      captureAndSendFollowup({
        leadId,
        followupToken,
        lead: {
          name: state.name,
          email: state.email,
          phone: state.phone,
          businessName: state.businessName,
          businessType: state.businessType ?? "informativa",
          ecommerceKind: state.ecommerceKind ?? undefined,
          sector: state.sector,
          offerings: state.offerings,
          palette: state.palette,
          typography: state.typography,
          style: state.style || undefined,
          hasLogo: !!state.logoDataUrl,
          address: state.address || undefined,
          city: state.city || undefined,
          currentWebsite: state.currentWebsite || undefined,
          featuredDishes: state.featuredDishes,
          valueProp: state.valueProp,
        },
      }).then((ok) =>
        track(ok ? "preview_followup_sent" : "preview_followup_fail", {
          leadId,
        }),
      );
    }, 1800);
    return () => clearTimeout(t);
    // Runs once (guarded by followupSentRef) using the wizard answers, which
    // are stable by the time the preview renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, followupToken, generating, generated]);

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return (
          state.businessType === "informativa" ||
          (state.businessType === "ecommerce" && !!state.ecommerceKind)
        );
      case 2:
        return state.businessName.trim().length >= 2 && !!state.sector;
      case 3:
        if (state.sector === "restauracion") return !!state.cuisine;
        return state.offerings.length >= 1 && state.offerings.length <= 6;
      case 4:
        return !!state.palette;
      case 5:
        return !!state.typography;
      case 6:
        return !!state.style;
      case 7:
        // Branding step is fully optional.
        return true;
      case 8:
        return (
          state.valueProp.trim().length >= 20 &&
          state.name.trim().length >= 2 &&
          isValidContactEmail(state.email) &&
          isValidContactPhone(state.phone) &&
          state.privacy
        );
      default:
        return false;
    }
  };

  const advance = () => {
    if (!canAdvance()) return;
    if (step < TOTAL_STEPS) {
      track("preview_step_advance", { step });
      setStep(step + 1);
      return;
    }
    handleSubmit();
  };

  const handleSubmit = () => {
    setSubmitError(null);
    const fd = new FormData();
    fd.set("businessType", state.businessType ?? "");
    if (state.ecommerceKind) fd.set("ecommerceKind", state.ecommerceKind);
    fd.set("businessName", state.businessName);
    fd.set("sector", state.sector);
    fd.set("currentWebsite", state.currentWebsite);
    fd.set("offerings", JSON.stringify(state.offerings));
    if (state.cuisine) fd.set("cuisine", state.cuisine);
    fd.set("featuredDishes", JSON.stringify(state.featuredDishes));
    fd.set("palette", state.palette);
    if (state.customColors) {
      fd.set("customColors", JSON.stringify(state.customColors));
    }
    fd.set("typography", state.typography);
    if (state.style) fd.set("style", state.style);
    fd.set("logoDataUrl", state.logoDataUrl);
    fd.set("address", state.address);
    fd.set("city", state.city);
    fd.set("valueProp", state.valueProp);
    fd.set("name", state.name);
    fd.set("email", state.email);
    fd.set("phone", state.phone);
    fd.set("privacy", state.privacy ? "on" : "");
    fd.set("website", state.website);
    fd.set("formLoadedAt", String(loadedAt.current));

    startTransition(async () => {
      const r = await sendPreviewLead(fd);
      if (r.ok && r.leadId) {
        pushUserData({ email: state.email, phone: state.phone });
        track("preview_lead_submit", {
          leadId: r.leadId,
          businessType: state.businessType,
        });
        setLeadId(r.leadId);
        setFollowupToken(r.followupToken ?? null);
        setGenerating(true);
        track("preview_generate_start", { leadId: r.leadId });
        const startedAt = Date.now();
        const result = await generatePreview({
          businessType: state.businessType!,
          ecommerceKind: state.ecommerceKind ?? undefined,
          businessName: state.businessName,
          sector: state.sector,
          offerings: state.offerings,
          cuisine: state.cuisine || undefined,
          currentWebsite: state.currentWebsite || undefined,
          featuredDishes:
            state.featuredDishes.length > 0 ? state.featuredDishes : undefined,
          palette: state.palette,
          customColors: state.customColors ?? undefined,
          typography: state.typography,
          style: state.style || "moderno",
          valueProp: state.valueProp,
          address: state.address || undefined,
          city: state.city || undefined,
        });
        setGenerated({
          copy: result.copy,
          sectorCopy: result.sectorCopy,
          heroImageDataUrl: result.heroImageDataUrl,
          sourceImageUrl: result.sourceImageUrl ?? null,
        });
        setGenerating(false);
        const durationMs = Date.now() - startedAt;
        const anyContent =
          !!result.copy || !!result.sectorCopy || !!result.heroImageDataUrl;
        if (!anyContent) {
          track("preview_generate_fail", {
            leadId: r.leadId,
            reason: result.error ?? "all_null",
            durationMs,
          });
        } else {
          track("preview_generate_success", {
            leadId: r.leadId,
            hadCopy: !!result.copy,
            hadSectorCopy: !!result.sectorCopy,
            hadImage: !!result.heroImageDataUrl,
            durationMs,
          });
        }
      } else {
        setSubmitError(r.error ?? "No se pudo enviar.");
      }
    });
  };

  // After submit: show loading, then preview + rating
  if (leadId && state.businessType) {
    const data: WebPreviewData = {
      businessType: state.businessType,
      ecommerceKind: state.ecommerceKind ?? undefined,
      businessName: state.businessName,
      sector: state.sector,
      offerings: state.offerings,
      cuisine: state.cuisine || undefined,
      palette: state.palette,
      customColors: state.customColors ?? undefined,
      typography: state.typography,
      style: state.style || "moderno",
      valueProp: state.valueProp,
      logoDataUrl: state.logoDataUrl || undefined,
      address: state.address || undefined,
      city: state.city || undefined,
      sourceImageUrl: generated?.sourceImageUrl ?? undefined,
    };

    if (generating || !generated) {
      return (
        <section className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
          <PreviewLoading />
        </section>
      );
    }

    // Preview mode: full-width below the site header, with disclaimer +
    // rating bar in a centered container above/below.
    return (
      <div ref={wizardRef}>
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <p className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-fg-muted">
            ⚡ <strong className="text-fg">Esta es una vista rápida</strong>{" "}
            generada con tus respuestas. Tu web real sería 100% personalizada:
            imágenes propias, copy adaptado a tu marca, animaciones, más
            secciones y muchísimo más detalle.
          </p>
        </div>
        <div className="mt-6">
          <WebPreview
            data={data}
            copy={generated.copy}
            sectorCopy={generated.sectorCopy}
            heroImageDataUrl={generated.heroImageDataUrl}
          />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <RatingBar
            leadId={leadId}
            contact={{ name: state.name, email: state.email, phone: state.phone }}
            data={data}
          />
        </div>
      </div>
    );
  }

  return (
    <section ref={wizardRef} className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <div className="mb-10 text-center">
        <p className="mb-3 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          Vista rápida
        </p>
        <h1 className="text-3xl font-bold sm:text-5xl">
          Imagina tu web en un vistazo
        </h1>
        <p className="mt-4 text-base text-fg-muted sm:text-lg">
          8 pasos rápidos y te mostramos cómo podría ser el home de tu
          negocio. Sin compromiso.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-bg-elevated p-6 sm:p-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
          <span>
            Paso {step} de {TOTAL_STEPS}
          </span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[280px]">
        {step === 1 && (
          <StepBusinessType
            value={{
              businessType: state.businessType,
              ecommerceKind: state.ecommerceKind,
            }}
            onChange={(v) =>
              setState({
                ...state,
                businessType: v.businessType,
                ecommerceKind: v.ecommerceKind,
              })
            }
          />
        )}
        {step === 2 && (
          <StepIdentity
            value={{
              businessName: state.businessName,
              sector: state.sector,
              currentWebsite: state.currentWebsite,
            }}
            onChange={(v) => setState({ ...state, ...v })}
          />
        )}
        {step === 3 && (
          <StepOfferings
            value={state.offerings}
            sector={state.sector}
            cuisine={state.cuisine}
            featuredDishes={state.featuredDishes}
            onChange={(v) =>
              setState({
                ...state,
                offerings: v.offerings,
                cuisine: v.cuisine,
                featuredDishes: v.featuredDishes,
              })
            }
          />
        )}
        {step === 4 && (
          <StepPalette
            value={state.palette}
            customColors={state.customColors}
            onChange={(slug, custom) =>
              setState({
                ...state,
                palette: slug,
                customColors: custom ?? null,
              })
            }
          />
        )}
        {step === 5 && (
          <StepTypography
            value={state.typography}
            onChange={(v) => setState({ ...state, typography: v })}
          />
        )}
        {step === 6 && (
          <StepStyle
            value={state.style}
            sector={state.sector}
            onChange={(v) => setState({ ...state, style: v })}
          />
        )}
        {step === 7 && (
          <StepBranding
            value={{
              logoDataUrl: state.logoDataUrl,
              address: state.address,
              city: state.city,
            }}
            onChange={(v) => setState({ ...state, ...v })}
          />
        )}
        {step === 8 && (
          <StepFinal
            value={{
              valueProp: state.valueProp,
              name: state.name,
              email: state.email,
              phone: state.phone,
              privacy: state.privacy,
              website: state.website,
            }}
            onChange={(v) => setState({ ...state, ...v })}
          />
        )}
      </div>

      {submitError && (
        <p className="mt-4 text-sm text-red-500">{submitError}</p>
      )}

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1 || pending}
          className="h-11 rounded-lg border border-border px-5 text-sm font-medium hover:bg-bg-subtle disabled:opacity-40"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={!canAdvance() || pending}
          className="inline-flex h-11 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-white shadow-md hover:bg-accent-hover disabled:opacity-50"
        >
          {pending
            ? "Generando…"
            : step === TOTAL_STEPS
              ? "Ver mi preview"
              : "Siguiente →"}
        </button>
      </div>
      </div>
    </section>
  );
}
