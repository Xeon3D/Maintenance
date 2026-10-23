import { describe, expect, it } from "vitest";
import { DEFAULT_JOB_ROLES, hourlyRateFor, parseRoleRates, roleName, workOrderRateFor } from "@/lib/roles";

describe("role rates", () => {
  const rates = parseRoleRates({ OWNER: 70, TECHNICIAN: "45", MANAGER: -5, VIEWER: 99, junk: 1 });

  it("keeps valid rates of billable built-in roles only", () => {
    expect(rates).toEqual({ OWNER: 70, TECHNICIAN: 45 });
    expect(parseRoleRates(null)).toEqual({});
  });

  it("uses the custom role's rate, then the built-in role's, then the legacy personal rate", () => {
    expect(hourlyRateFor({ role: "TECHNICIAN", jobRole: { hourlyRate: "65.00" } }, rates)).toBe(65);
    expect(hourlyRateFor({ role: "TECHNICIAN", jobRole: { hourlyRate: null } }, rates)).toBe(45);
    expect(hourlyRateFor({ role: "TECHNICIAN", jobRole: null, hourlyRate: 30 }, rates)).toBe(45);
    expect(hourlyRateFor({ role: "ADMIN", jobRole: null, hourlyRate: "30" }, rates)).toBe(30);
    expect(hourlyRateFor({ role: "MANAGER", jobRole: null }, rates)).toBeNull();
  });

  it("never costs observers or clients", () => {
    expect(hourlyRateFor({ role: "VIEWER", hourlyRate: 20 }, { VIEWER: 99 })).toBeNull();
    expect(hourlyRateFor({ role: "REQUESTER", jobRole: { hourlyRate: 10 } }, rates)).toBeNull();
  });

  it("names custom roles by their own name", () => {
    const builtIn = (r: string) => `built-in ${r}`;
    expect(roleName({ role: "TECHNICIAN", jobRole: { name: "Engineer" } }, builtIn)).toBe("Engineer");
    expect(roleName({ role: "MANAGER", jobRole: null }, builtIn)).toBe("built-in MANAGER");
  });
});

describe("rate on a work order", () => {
  const rates = parseRoleRates({ OWNER: 70, MANAGER: 60, TECHNICIAN: 45 });
  const manager = { role: "MANAGER" as const, jobRole: null };

  it("charges the person's own role when they took none on the job", () => {
    expect(workOrderRateFor(manager, null, rates)).toBe(60);
    expect(workOrderRateFor(manager, { role: null, jobRole: null }, rates)).toBe(60);
  });

  it("charges the role taken on the job: Technician, or a company role", () => {
    expect(workOrderRateFor(manager, { role: "TECHNICIAN", jobRole: null }, rates)).toBe(45);
    expect(workOrderRateFor(manager, { role: null, jobRole: { access: "TECHNICIAN", hourlyRate: "25.00" } }, rates)).toBe(25);
  });

  it("charges a company role without a rate at the Technician rate", () => {
    expect(workOrderRateFor(manager, { role: null, jobRole: { access: "TECHNICIAN", hourlyRate: null } }, rates)).toBe(45);
  });

  it("starts new companies with the default roles", () => {
    expect(DEFAULT_JOB_ROLES).toEqual(["Designer", "Electrician", "Engineer", "Helper", "Integrator"]);
  });
});
