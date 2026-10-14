export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/**
 * Locale used for formatting (dates, times, numbers). Plain "en" formats US-style (10/14/2026, 2:00 PM),
 * so English uses British conventions — day/month/year and the 24-hour clock — like Portuguese.
 */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", pt: "pt-PT" };

/** App locale from a formatting locale ("en-GB" → "en", "pt-PT" → "pt"). */
export const appLocale = (intl: string): Locale => (intl.toLowerCase().startsWith("pt") ? "pt" : "en");
