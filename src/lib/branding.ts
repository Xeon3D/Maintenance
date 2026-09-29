// Company branding: brand colour, logo URL and the details printed on documents. Pure (no server
// imports), so pages, PDFs, emails and tests share it.

export const DEFAULT_BRAND = "#1f4f8f";
/** Buttons put white text on the brand colour, and links use it as text on white: both need 4.5:1. */
export const MIN_CONTRAST = 4.5;

export function normalizeHex(v: string | null | undefined) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((v ?? "").trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${h.toLowerCase()}`;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between the colour and white. */
export function contrastWithWhite(hex: string) {
  return 1.05 / (luminance(hex) + 0.05);
}

export function brandColor(org: { brandColor?: string | null }) {
  const c = normalizeHex(org.brandColor);
  return c && contrastWithWhite(c) >= MIN_CONTRAST ? c : DEFAULT_BRAND;
}

/** Inline CSS variables that re-theme everything below (Tailwind's `brand` utilities read --color-brand). */
export function brandStyle(org: { brandColor?: string | null }) {
  const c = brandColor(org);
  return (c === DEFAULT_BRAND ? {} : { "--brand": c, "--color-brand": c }) as React.CSSProperties;
}

type LogoOrg = { id: string; logoUrl?: string | null; updatedAt: Date };

/** Public URL of the logo (versioned, so a new upload isn't hidden by caches), or null. */
export function logoSrc(org: LogoOrg, origin = "") {
  return org.logoUrl ? `${origin}/api/org-logo/${org.id}?v=${org.updatedAt.getTime()}` : null;
}

type DetailsOrg = {
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
};

/** Letterhead lines: legal name, address, tax number, then contact details on one line. */
export function companyLines(org: DetailsOrg, taxLabel: string) {
  const contact = [org.phone, org.email, org.website?.replace(/^https?:\/\//, "")].filter(Boolean).join(" · ");
  return [
    org.legalName && org.legalName !== org.name ? org.legalName : null,
    ...(org.address ? org.address.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : []),
    org.taxId ? `${taxLabel}: ${org.taxId}` : null,
    contact || null,
  ].filter((l): l is string => !!l);
}
