"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendPreviewLead } from "@/lib/preview-lead-action";
import { track } from "@/lib/gtm";
import { StepBusinessType } from "./steps/StepBusinessType";
import { StepIdentity } from "./steps/StepIdentity";
import { StepOfferings } from "./steps/StepOfferings";
import { StepPalette } from "./steps/StepPalette";
import { StepTypography } from "./steps/StepTypography";
import { StepFinal } from "./steps/StepFinal";
import { WebPreview, type WebPreviewData } from "./WebPreview";
import { RatingBar } from "./RatingBar";
import { generatePreview } from "@/lib/preview-generate-action";
import { PreviewLoading } from "./PreviewLoading";
import type { CopyResponse } from "@/lib/preview-validation";

interface WizardState {
  businessType: "informativa" | "ecommerce" | null;
  ecommerceKind: "productos" | "servicios" | null;
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
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
  palette: "",
  typography: "",
  valueProp: "",
  name: "",
  email: "",
  phone: "",
  privacy: false,
  website: "",
};

const TOTAL_STEPS = 6;

export function PreviewWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{
    copy: CopyResponse | null;
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
        return state.offerings.length >= 1 && state.offerings.length <= 6;
      case 4:
        return !!state.palette;
      case 5:
        return !!state.typography;
      case 6:
        return (
          state.valueProp.trim().length >= 20 &&
          state.name.trim().length >= 2 &&
          /.+@.+\..+/.test(state.email) &&
          state.phone.trim().length >= 6 &&
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
    fd.set("palette", state.palette);
    fd.set("typography", state.typography);
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
          palette: state.palette,
          typography: state.typography,
          valueProp: state.valueProp,
        });
        setGenerated({
          copy: result.copy,
          heroImageDataUrl: result.heroImageDataUrl,
        });
        setGenerating(false);
        const durationMs = Date.now() - startedAt;
        if (!result.copy && !result.heroImageDataUrl) {
          track("preview_generate_fail", {
            leadId: r.leadId,
            reason: result.error ?? "both_null",
            durationMs,
          });
        } else {
          track("preview_generate_success", {
            leadId: r.leadId,
            hadCopy: !!result.copy,
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
      palette: state.palette,
      typography: state.typography,
      valueProp: state.valueProp,
    };

    if (generating || !generated) {
      return (
        <div className="space-y-6">
          <PreviewLoading />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-fg-muted">
          ⚡ <strong className="text-fg">Esta es una vista rápida</strong>{" "}
          generada con tus respuestas. Tu web real sería 100% personalizada:
          imágenes propias, copy adaptado a tu marca, animaciones, más
          secciones y muchísimo más detalle.
        </p>
        <WebPreview
          data={data}
          copy={generated.copy}
          heroImageDataUrl={generated.heroImageDataUrl}
        />
        <RatingBar
          leadId={leadId}
          contact={{ name: state.name, email: state.email, phone: state.phone }}
          data={data}
        />
      </div>
    );
  }

  return (
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
            onChange={(v) => setState({ ...state, offerings: v })}
          />
        )}
        {step === 4 && (
          <StepPalette
            value={state.palette}
            onChange={(v) => setState({ ...state, palette: v })}
          />
        )}
        {step === 5 && (
          <StepTypography
            value={state.typography}
            onChange={(v) => setState({ ...state, typography: v })}
          />
        )}
        {step === 6 && (
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
  );
}
