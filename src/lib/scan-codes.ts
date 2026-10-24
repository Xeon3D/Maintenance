// What a scan means for the field it fills: barcodes on equipment labels often hold the serial number or
// the MAC address, and photographed label text (OCR) needs picking out of the noise.

export type ScanPurpose = "any" | "serial" | "mac";

const HEX = "[0-9A-Fa-f]";
const MAC_PATTERNS = [
  new RegExp(`(?<![0-9A-Fa-f])(${HEX}{2})([:-])(${HEX}{2})\\2(${HEX}{2})\\2(${HEX}{2})\\2(${HEX}{2})\\2(${HEX}{2})(?![0-9A-Fa-f])`), // 00:1A:2B:3C:4D:5E / 00-1a-…
  new RegExp(`(?<![0-9A-Fa-f.])(${HEX}{4})\\.(${HEX}{4})\\.(${HEX}{4})(?![0-9A-Fa-f.])`), // 001a.2b3c.4d5e (Cisco)
  new RegExp(`(?<![0-9A-Za-z])(${HEX}{12})(?![0-9A-Za-z])`), // 001A2B3C4D5E
];

/** The first MAC address in `text`, as AA:BB:CC:DD:EE:FF; null when there is none. */
export function findMac(text: string): string | null {
  for (const re of MAC_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const hex = m[0].replace(/[^0-9A-Fa-f]/g, "");
    if (hex.length !== 12) continue;
    // A plain 12-digit number is far more likely a serial or an EAN than a MAC.
    if (re === MAC_PATTERNS[2] && !/[A-Fa-f]/.test(hex)) continue;
    return hex.toUpperCase().match(/.{2}/g)!.join(":");
  }
  return null;
}

/** All MAC addresses in a block of text, normalised, in order of appearance. */
export function findMacs(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    for (const token of line.split(/\s+/)) {
      const mac = findMac(token.replace(/^[^0-9A-Fa-f]+|[^0-9A-Fa-f]+$/g, ""));
      if (mac && !out.includes(mac)) out.push(mac);
    }
    const whole = findMac(line);
    if (whole && !out.includes(whole)) out.push(whole);
  }
  return out;
}

// "S/N", "SN", "Serial No.", "Serial number", "Nº de série", "N/S", "Ser. No"
const SERIAL_LABEL = /\b(?:s\s*\/\s*n|sn|ser(?:ial)?\.?\s*(?:no|nr|num(?:ber)?|#)?|n\.?\s*[ºo°]?\s*(?:de\s*)?s[ée]rie|n\s*\/\s*s)\s*[:#.\-]?\s*([A-Za-z0-9][A-Za-z0-9\-/.]{3,40})/i;
const MAC_LABEL = /\b(?:mac|ethernet|lan|wlan|wi-?fi)\b/i;
const NOT_A_CODE = /^(?:model|serial|made|china|input|output|power|class|rated|type|warning|caution|version|www|http)/i;

/**
 * Likely answers in OCR'd label text, best first: for "mac" the MAC addresses; for "serial" the value after a
 * serial-number label, then other code-looking tokens (letters and digits). At most `max`.
 */
export function textCandidates(text: string, purpose: ScanPurpose, max = 8): string[] {
  const out: string[] = [];
  const add = (s: string | null | undefined) => {
    const v = s?.trim().replace(/[.,;:]+$/, "");
    if (v && v.length >= 4 && !out.includes(v)) out.push(v);
  };
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (purpose === "mac") {
    // Lines labelled MAC / LAN first, then any MAC on the label.
    for (const l of lines) if (MAC_LABEL.test(l)) findMacs(l).forEach(add);
    // A serial number can look like a bare MAC (12 hex characters): skip lines labelled as one.
    for (const l of lines) if (!SERIAL_LABEL.test(l)) findMacs(l).forEach(add);
    return out.slice(0, max);
  }

  for (const l of lines) add(l.match(SERIAL_LABEL)?.[1]);
  if (purpose === "serial") {
    for (const l of lines) {
      for (const token of l.split(/\s+/)) {
        const t = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
        if (t.length < 6 || t.length > 40 || NOT_A_CODE.test(t)) continue;
        const digits = /\d/.test(t);
        const letters = /[A-Za-z]/.test(t);
        if ((digits && letters) || (digits && t.length >= 8)) add(t);
      }
    }
  } else {
    lines.forEach(add);
  }
  return out.slice(0, max);
}

/** A scanned barcode's value for the field: MAC fields get a normalised MAC when the code contains one. */
export function codeFor(raw: string, purpose: ScanPurpose): string {
  const text = raw.trim();
  if (purpose === "mac") return findMac(text) ?? text;
  if (purpose === "serial") {
    // Labels sometimes encode "S/N:ABC123" or "SN ABC123" in the barcode itself.
    const labelled = text.match(SERIAL_LABEL)?.[1];
    return labelled ?? text;
  }
  return text;
}
