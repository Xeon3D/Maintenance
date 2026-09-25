import type { SystemType } from "@/generated/prisma/enums";

/** Autocomplete suggestions for the free-text asset category, per system. */
export const CATEGORY_SUGGESTIONS: Record<SystemType, string[]> = {
  ELECTRICAL: [
    "Distribution board",
    "RCD / RCBO",
    "Surge protector",
    "UPS",
    "Generator",
    "Transfer switch",
    "EV charger",
    "Solar inverter",
    "Battery storage",
    "Energy meter",
  ],
  AUTOMATION: [
    "KNX IP router",
    "KNX power supply",
    "KNX actuator",
    "KNX keypad",
    "Home controller",
    "Touch panel",
    "Weather station",
    "Motorised blinds controller",
    "HVAC gateway",
    "Irrigation controller",
  ],
  NETWORK: [
    "Rack",
    "Router / firewall",
    "PoE switch",
    "Access point",
    "ONT / modem",
    "Patch panel",
    "NAS",
    "Rack PDU",
    "Mesh node",
  ],
  SECURITY: [
    "Alarm panel",
    "Keypad",
    "Motion detector",
    "Door contact",
    "Siren",
    "Access control reader",
    "Video intercom",
    "Gate controller",
    "Smoke detector",
  ],
  CCTV: ["NVR", "IP camera (dome)", "IP camera (bullet)", "PTZ camera", "Video monitor", "PoE injector"],
  AV: [
    "AV receiver",
    "Amplifier",
    "Projector",
    "Projection screen",
    "Television",
    "Soundbar",
    "Ceiling speaker",
    "Subwoofer",
    "Streamer",
    "Video matrix",
    "HDMI extender",
    "Remote / control system",
  ],
  LIGHTING: [
    "Lighting controller",
    "Dimmer module",
    "DALI gateway",
    "LED driver",
    "Keypad",
    "Landscape lighting transformer",
    "Pool lighting",
  ],
  OTHER: [],
};

const MAC_RE = /^([0-9a-f]{2}[:-]?){5}[0-9a-f]{2}$/i;

/** Normalises MAC addresses to AA:BB:CC:DD:EE:FF; returns null if invalid. */
export function normaliseMac(v: string): string | null {
  const s = v.trim();
  if (!MAC_RE.test(s)) return null;
  const hex = s.replace(/[:-]/g, "").toUpperCase();
  return hex.match(/.{2}/g)!.join(":");
}

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export function isIpAddress(v: string): boolean {
  const s = v.trim();
  return IPV4_RE.test(s) || (s.includes(":") && /^[0-9a-f:.]+$/i.test(s));
}
