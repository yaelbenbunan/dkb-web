"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendPreviewLead } from "@/lib/preview-lead-action";
import { track } from "@/lib/gtm";
import { StepBusinessType } from "./steps/StepBusinessType";
import { StepIdentity } from "./steps/StepIdentity";
import { StepOfferings } from "./steps/StepOfferings";
import { StepPalette } from "./steps/StepPalette";
import { StepTypography } from "./steps/StepTypography";
import { StepBranding } from "./steps/StepBranding";
import { StepFinal } from "./steps/StepFinal";
import { WebPreview, type WebPreviewData } from "./WebPreview";
import { RatingBar } from "./RatingBar";
import { generatePreview } from "@/lib/preview-generate-action";
import { PreviewLoading } from "./PreviewLoading";
import {
  isValidContactEmail,
  isValidContactPhone,
  type CopyResponse,
  type SectorInformativaCopyResponse,
} from "@/lib/preview-validation";
import type { CustomPaletteColors } from "@/lib/preview-themes";
import type { Cuisine } from "./templates/sector-assets";

interface WizardState {
  businessType: "informativa" | "ecommerce" | null;
  ecommerceKind: "productos" | "servicios" | null;
  businessName: string;
  sector: string;
  offerings: string[];
  /** Set only when `sector === "restauracion"` */
  cuisine: Cuisine | "";
  palette: string;
  /** Set only when `palette === CUSTOM_PALETTE_SLUG` */
  customColors: CustomPaletteColors | null;
  typography: string;
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
  offerings: [],
  cuisine: "",
  palette: "",
  customColors: null,
  typography: "",
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

const TOTAL_STEPS = 7;

export function PreviewWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{
    copy: CopyResponse | null;
    sectorCopy: SectorInformativaCopyResponse | null;
    heroImageDataUrl: string | null;
  } | null>(null);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    loadedAt.current = Date.now();
    track("preview_wizard_start");
  }, []);

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
        // Branding step is fully optional.
        return true;
      case 7:
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
    fd.set("offerings", JSON.stringify(state.offerings));
    if (state.cuisine) fd.set("cuisine", state.cuisine);
    fd.set("palette", state.palette);
    if (state.customColors) {
      fd.set("customColors", JSON.stringify(state.customColors));
    }
    fd.set("typography", state.typography);
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
        track("preview_lead_submit", {
          leadId: r.leadId,
          businessType: state.businessType,
        });
        setLeadId(r.leadId);
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
          palette: state.palette,
          customColors: state.customColors ?? undefined,
          typography: state.typography,
          valueProp: state.valueProp,
          address: state.address || undefined,
          city: state.city || undefined,
        });
        setGenerated({
          copy: result.copy,
          sectorCopy: result.sectorCopy,
          heroImageDataUrl: result.heroImageDataUrl,
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
      valueProp: state.valueProp,
      logoDataUrl: state.logoDataUrl || undefined,
      address: state.address || undefined,
      city: state.city || undefined,
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
      <div>
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
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <div className="mb-10 text-center">
        <p className="mb-3 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          Vista rápida
        </p>
        <h1 className="text-3xl font-bold sm:text-5xl">
          Imagina tu web en un vistazo
        </h1>
        <p className="mt-4 text-base text-fg-muted sm:text-lg">
          7 pasos rápidos y te mostramos cómo podría ser el home de tu
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
            value={{ businessName: state.businessName, sector: state.sector }}
            onChange={(v) => setState({ ...state, ...v })}
          />
        )}
        {step === 3 && (
          <StepOfferings
            value={state.offerings}
            sector={state.sector}
            cuisine={state.cuisine}
            onChange={(v) =>
              setState({ ...state, offerings: v.offerings, cuisine: v.cuisine })
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
          <StepBranding
            value={{
              logoDataUrl: state.logoDataUrl,
              address: state.address,
              city: state.city,
            }}
            onChange={(v) => setState({ ...state, ...v })}
          />
        )}
        {step === 7 && (
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
