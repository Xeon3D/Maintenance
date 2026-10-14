import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** `export const generateMetadata = titled("nav.assets")`: a browser-tab title in the reader's language. */
export function titled(key: string) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations();
    return { title: t(key as never) };
  };
}
