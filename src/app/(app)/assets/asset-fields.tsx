"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { CATEGORY_SUGGESTIONS } from "@/lib/asset-catalog";
import { dateInput } from "@/lib/forms";
import { descendantsOf, flattenTree } from "@/lib/tree";
import { AssetStatus, Criticality, SystemType } from "@/generated/prisma/enums";

type Ref = { id: string; name: string; villaId: string; parentId: string | null };

export type AssetDefaults = {
  id?: string;
  villaId?: string;
  areaId?: string | null;
  parentId?: string | null;
  vendorId?: string | null;
  name?: string;
  code?: string | null;
  system?: SystemType;
  category?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  macAddress?: string | null;
  ipAddress?: string | null;
  vlan?: string | null;
  firmware?: string | null;
  status?: AssetStatus;
  criticality?: Criticality;
  installDate?: Date | null;
  warrantyExpiry?: Date | null;
  purchaseCost?: string | null;
  notes?: string | null;
};

export function AssetFields({
  asset,
  villas,
  areas,
  assets,
  vendors,
}: {
  asset: AssetDefaults;
  villas: { id: string; name: string; code: string | null }[];
  areas: Ref[];
  assets: Ref[];
  vendors: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const [villaId, setVillaId] = useState(asset.villaId ?? "");
  const [system, setSystem] = useState<SystemType>(asset.system ?? "NETWORK");

  const villaAreas = useMemo(() => flattenTree(areas.filter((a) => a.villaId === villaId)), [areas, villaId]);
  const villaAssets = useMemo(() => {
    const inVilla = assets.filter((a) => a.villaId === villaId);
    const blocked = asset.id ? descendantsOf(inVilla, asset.id) : new Set<string>();
    return flattenTree(inVilla).filter((a) => !blocked.has(a.id));
  }, [assets, villaId, asset.id]);

  return (
    <>
      <Section title={t("assets.sectionLocation")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("assets.villa")}>
            <Select name="villaId" value={villaId} onChange={(e) => setVillaId(e.target.value)} required>
              <option value="" disabled>
                —
              </option>
              {villas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.code ? ` (${v.code})` : ""}
                </option>
              ))}
            </Select>
            <FieldError name="villaId" />
          </Field>
          <Field label={t("assets.area")}>
            <Select key={`area-${villaId}`} name="areaId" defaultValue={asset.villaId === villaId ? (asset.areaId ?? "") : ""}>
              <option value="">—</option>
              {villaAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {"  ".repeat(a.depth)}
                  {a.name}
                </option>
              ))}
            </Select>
            <FieldError name="areaId" />
          </Field>
          <Field label={t("assets.parent")} hint={t("assets.parentHint")}>
            <Select key={`parent-${villaId}`} name="parentId" defaultValue={asset.villaId === villaId ? (asset.parentId ?? "") : ""}>
              <option value="">—</option>
              {villaAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {"  ".repeat(a.depth)}
                  {a.name}
                </option>
              ))}
            </Select>
            <FieldError name="parentId" />
          </Field>
        </div>
      </Section>

      <Section title={t("assets.sectionIdentity")}>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label={t("common.name")}>
            <Input name="name" defaultValue={asset.name} required placeholder={t("assets.namePlaceholder")} />
            <FieldError name="name" />
          </Field>
          <Field label={t("assets.code")}>
            <Input name="code" defaultValue={asset.code ?? ""} className="font-mono" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("assets.system")}>
            <Select name="system" value={system} onChange={(e) => setSystem(e.target.value as SystemType)}>
              {Object.values(SystemType).map((s) => (
                <option key={s} value={s}>
                  {t(`systems.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("assets.category")}>
            <Input name="category" defaultValue={asset.category ?? ""} list="asset-categories" />
            <datalist id="asset-categories">
              {CATEGORY_SUGGESTIONS[system].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("assets.manufacturer")}>
            <Input name="manufacturer" defaultValue={asset.manufacturer ?? ""} />
          </Field>
          <Field label={t("assets.model")}>
            <Input name="model" defaultValue={asset.model ?? ""} />
          </Field>
          <Field label={t("assets.serialNumber")}>
            <Input name="serialNumber" defaultValue={asset.serialNumber ?? ""} className="font-mono" />
          </Field>
        </div>
      </Section>

      <Section title={t("assets.sectionNetwork")} hint={t("assets.sectionNetworkHint")}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label={t("assets.ipAddress")}>
            <Input name="ipAddress" defaultValue={asset.ipAddress ?? ""} className="font-mono" placeholder="10.0.0.10" />
            <FieldError name="ipAddress" />
          </Field>
          <Field label={t("assets.macAddress")}>
            <Input name="macAddress" defaultValue={asset.macAddress ?? ""} className="font-mono" placeholder="AA:BB:CC:DD:EE:FF" />
            <FieldError name="macAddress" />
          </Field>
          <Field label={t("assets.vlan")}>
            <Input name="vlan" defaultValue={asset.vlan ?? ""} className="font-mono" />
          </Field>
          <Field label={t("assets.firmware")}>
            <Input name="firmware" defaultValue={asset.firmware ?? ""} className="font-mono" />
          </Field>
        </div>
      </Section>

      <Section title={t("assets.sectionLifecycle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("common.status")}>
            <Select name="status" defaultValue={asset.status ?? "OPERATIONAL"}>
              {Object.values(AssetStatus).map((s) => (
                <option key={s} value={s}>
                  {t(`assetStatus.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("assets.criticality")}>
            <Select name="criticality" defaultValue={asset.criticality ?? "MEDIUM"}>
              {Object.values(Criticality).map((c) => (
                <option key={c} value={c}>
                  {t(`criticality.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label={t("assets.installDate")}>
            <Input name="installDate" type="date" defaultValue={dateInput(asset.installDate)} />
          </Field>
          <Field label={t("assets.warrantyExpiry")}>
            <Input name="warrantyExpiry" type="date" defaultValue={dateInput(asset.warrantyExpiry)} />
          </Field>
          <Field label={t("assets.purchaseCost")}>
            <Input name="purchaseCost" inputMode="decimal" defaultValue={asset.purchaseCost ?? ""} />
            <FieldError name="purchaseCost" />
          </Field>
          <Field label={t("assets.vendor")}>
            <Select name="vendorId" defaultValue={asset.vendorId ?? ""}>
              <option value="">—</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("common.notes")}>
          <Textarea name="notes" defaultValue={asset.notes ?? ""} />
        </Field>
      </Section>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-b border-border pb-6 last:border-0">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
