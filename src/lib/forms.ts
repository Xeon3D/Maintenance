import { z } from "zod";

// Zod helpers for FormData: HTML forms send "" for empty fields and omit unchecked boxes.

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const str = (max = 200) => z.string().trim().min(1).max(max);

/** Optional text → trimmed string or null. */
export const optStr = (max = 500) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional()).transform((v) => v ?? null);

/** Optional id reference → string or null. */
export const optId = () => z.preprocess(blankToUndefined, z.string().max(40).optional()).transform((v) => v ?? null);

/** Optional yyyy-mm-dd → Date or null. */
export const optDate = () =>
  z.preprocess(blankToUndefined, z.coerce.date().optional()).transform((v) => v ?? null);

export const optNumber = () =>
  z.preprocess(blankToUndefined, z.coerce.number().finite().optional()).transform((v) => v ?? null);

export const optInt = () =>
  z.preprocess(blankToUndefined, z.coerce.number().int().optional()).transform((v) => v ?? null);

export function enumOf<T extends Record<string, string>>(e: T) {
  return z.enum(Object.values(e) as [T[keyof T], ...T[keyof T][]]);
}

export function optEnumOf<T extends Record<string, string>>(e: T) {
  return z.preprocess(blankToUndefined, enumOf(e).optional()).transform((v) => v ?? null);
}

export type FormResult = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

/** Parse FormData with a schema; returns data or a FormResult describing field errors. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  form: FormData,
): { data: z.output<S>; error?: undefined } | { data?: undefined; error: NonNullable<FormResult> } {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (parsed.success) return { data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".");
    // Translated via messages "validation.<code>"; custom refinements carry their key in `message`.
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.code === "custom" ? issue.message : issue.code;
  }
  return { error: { error: "validation", fieldErrors } };
}

/** yyyy-mm-dd for <input type="date"> default values. */
export function dateInput(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}
