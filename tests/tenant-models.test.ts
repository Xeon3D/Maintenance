import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));

import { TENANT_MODELS } from "@/lib/db/tenant";

// Every model with an `organizationId` column must be in TENANT_MODELS, or the tenant
// guard would silently skip it.
describe("TENANT_MODELS", () => {
  it("matches the models in schema.prisma that have organizationId", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
      .filter(([, , body]) => /^\s+organizationId\s/m.test(body))
      .map(([, name]) => name)
      .sort();
    expect([...TENANT_MODELS].sort()).toEqual(models);
  });
});
