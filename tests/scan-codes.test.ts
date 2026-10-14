import { describe, expect, it } from "vitest";
import { codeFor, findMac, findMacs, textCandidates } from "@/lib/scan-codes";

describe("MAC addresses", () => {
  it("reads every common notation and normalises it", () => {
    expect(findMac("00:1a:2b:3c:4d:5e")).toBe("00:1A:2B:3C:4D:5E");
    expect(findMac("MAC 00-1A-2B-3C-4D-5E")).toBe("00:1A:2B:3C:4D:5E");
    expect(findMac("001a.2b3c.4d5e")).toBe("00:1A:2B:3C:4D:5E");
    expect(findMac("LAN:001A2B3C4D5E")).toBe("00:1A:2B:3C:4D:5E");
  });

  it("does not take serials, EANs or mixed separators for a MAC", () => {
    expect(findMac("5601234567890")).toBeNull(); // EAN-13
    expect(findMac("123456789012")).toBeNull(); // 12 digits, no hex letters
    expect(findMac("00:1A-2B:3C-4D:5E")).toBeNull();
    expect(findMac("SN 2C45ABCDEF0123")).toBeNull(); // 14 hex characters
  });

  it("finds each MAC on a label once", () => {
    expect(findMacs("WAN 00:11:22:33:44:AA\nLAN 00:11:22:33:44:AB\nwan 00-11-22-33-44-aa")).toEqual(["00:11:22:33:44:AA", "00:11:22:33:44:AB"]);
  });
});

describe("OCR candidates", () => {
  const label = ["UniFi Switch 24 PoE", "Model: USW-24-POE", "S/N: 2C45F8A1B3C9", "MAC: 74:83:C2:1A:2B:3C", "Made in China", "Input 100-240V"].join("\n");

  it("puts the labelled serial number first", () => {
    const c = textCandidates(label, "serial");
    expect(c[0]).toBe("2C45F8A1B3C9");
    expect(c).not.toContain("Made");
  });

  it("reads Portuguese labels too", () => {
    expect(textCandidates("Nº de série: AB12345678\nRef. 1234", "serial")[0]).toBe("AB12345678");
  });

  it("offers the MAC for MAC fields", () => {
    expect(textCandidates(label, "mac")).toEqual(["74:83:C2:1A:2B:3C"]);
  });
});

describe("scanned barcodes", () => {
  it("keeps the code, normalising MACs and dropping serial labels", () => {
    expect(codeFor("7483C21A2B3C", "mac")).toBe("74:83:C2:1A:2B:3C");
    expect(codeFor("S/N:ABC12345", "serial")).toBe("ABC12345");
    expect(codeFor(" 5601234567890 ", "any")).toBe("5601234567890");
  });
});
