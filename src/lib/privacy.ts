// Privacy notice (GDPR art. 12–14). Each company has a public page at /privacy/<slug>: its own text
// (Settings → Organization) or, until it writes one, the built-in template filled with its details.

export const PRIVACY_SECTIONS = ["controller", "data", "purposes", "recipients", "retention", "security", "rights"] as const;

export const privacyPath = (org: { slug: string }) => `/privacy/${org.slug}`;

/** Splits plain text into paragraphs (blank lines), keeping single line breaks inside them. */
export function paragraphs(text: string) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
