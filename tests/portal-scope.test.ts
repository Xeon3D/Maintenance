import { describe, expect, it } from "vitest";
import { portalScopes, villaAccess } from "@/lib/portal-scope";

// Evaluates a Prisma-style villa filter against a plain object (enough for OR / equals / archivedAt).
type Villa = { id: string; clientId: string; managerId: string | null; archivedAt: Date | null };
function matches(v: Villa, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, cond]) =>
    k === "OR" ? (cond as Record<string, unknown>[]).some((w) => matches(v, w)) : v[k as keyof Villa] === cond,
  );
}

describe("portal villa access", () => {
  const villas: Villa[] = [
    { id: "whitmore-1", clientId: "whitmore", managerId: "pm", archivedAt: null },
    { id: "berg-1", clientId: "bergstrom", managerId: "pm", archivedAt: null },
    { id: "berg-2", clientId: "bergstrom", managerId: null, archivedAt: null },
    { id: "pm-own", clientId: "pm", managerId: null, archivedAt: null },
  ];
  const visible = (clientId: string) => villas.filter((v) => matches(v, portalScopes(clientId, "u").villaWhere)).map((v) => v.id);

  it("owners see only their own villas, even when a manager is shared", () => {
    expect(visible("whitmore")).toEqual(["whitmore-1"]);
    expect(visible("bergstrom")).toEqual(["berg-1", "berg-2"]);
  });

  it("a property manager sees every villa it manages, across owners, plus its own", () => {
    expect(visible("pm")).toEqual(["whitmore-1", "berg-1", "pm-own"]);
  });

  it("uses the same rule for requests and work orders", () => {
    const s = portalScopes("pm", "u");
    expect(s.requestWhere.OR[0]).toEqual({ villa: villaAccess("pm") });
    expect(s.requestWhere.OR[1]).toEqual({ requesterId: "u" });
    expect(s.workOrderWhere).toEqual({ clientVisible: true, villa: villaAccess("pm") });
  });
});
