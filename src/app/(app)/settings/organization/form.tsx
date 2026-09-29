"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2 } from "lucide-react";
import { FieldError, FieldErrorsProvider } from "@/components/action-form";
import { Button, Field, Input } from "@/components/ui";
import { contrastWithWhite, MIN_CONTRAST, normalizeHex } from "@/lib/branding";
import { useActionForm } from "@/lib/use-action-form";
import { removeLogoAction, uploadLogoAction } from "../actions";

/** Colour picker + hex box with a live button preview and a contrast warning (the server enforces it too). */
export function BrandColorField({ defaultValue, fallback }: { defaultValue: string; fallback: string }) {
  const t = useTranslations("company");
  const [value, setValue] = useState(defaultValue);
  const hex = normalizeHex(value);
  const shown = hex ?? fallback;
  const tooLight = !!hex && contrastWithWhite(hex) < MIN_CONTRAST;

  return (
    <Field label={t("brandColor")} hint={t("brandColorHint")}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={shown}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-surface p-1"
          aria-label={t("brandColor")}
        />
        <Input name="brandColor" value={value} onChange={(e) => setValue(e.target.value)} placeholder={fallback} className="w-32 font-mono" maxLength={7} />
        <span className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-white" style={{ backgroundColor: shown }}>
          {t("preview")}
        </span>
        <span className="text-sm font-medium" style={{ color: shown }}>
          {t("linkPreview")}
        </span>
        {value && (
          <button type="button" className="text-xs text-muted underline" onClick={() => setValue("")}>
            {t("resetColor")}
          </button>
        )}
      </div>
      {/* Checked live here; the server enforces the same rules (and marks the form invalid). */}
      {tooLight && <span className="block text-xs text-danger">{t("tooLight")}</span>}
      {value.trim() !== "" && !hex && <span className="block text-xs text-danger">{t("badColor")}</span>}
    </Field>
  );
}

/** Upload/replace/remove the logo, with a preview on white and on the brand colour. */
export function LogoUploader({ src, name, color }: { src: string | null; name: string; color: string }) {
  const t = useTranslations();
  const input = useRef<HTMLInputElement>(null);
  const [state, submit, uploading] = useActionForm(uploadLogoAction);
  const [removing, startRemove] = useTransition();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex h-20 items-center justify-center rounded-md border border-border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt={name} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">{t("company.noLogo")}</span>}
        </div>
        <div className="flex h-20 items-center justify-center rounded-md p-2" style={{ backgroundColor: color }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" className="max-h-full max-w-full rounded bg-white/95 object-contain p-1" /> : <span className="text-xs text-white/80">{name}</span>}
        </div>
      </div>
      <form onSubmit={submit}>
        <FieldErrorsProvider errors={state?.fieldErrors}>
          <input
            ref={input}
            type="file"
            name="logo"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => e.target.files?.length && e.currentTarget.form?.requestSubmit()}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => input.current?.click()}>
              <ImagePlus className="size-4" />
              {uploading ? t("checklist.uploading") : src ? t("company.replaceLogo") : t("company.uploadLogo")}
            </Button>
            {src && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={removing}
                onClick={() => confirm(t("company.removeLogoConfirm")) && startRemove(() => removeLogoAction())}
              >
                <Trash2 className="size-4" />
                {t("common.remove")}
              </Button>
            )}
          </div>
          <FieldError name="logo" />
          {state?.ok && <p className="mt-1 text-xs text-green-700">{t("common.saved")}</p>}
        </FieldErrorsProvider>
      </form>
    </div>
  );
}
