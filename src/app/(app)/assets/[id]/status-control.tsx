"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select } from "@/components/ui";
import { AssetStatus } from "@/generated/prisma/enums";
import { setAssetStatusAction } from "../actions";

export function StatusControl({ id, status }: { id: string; status: AssetStatus }) {
  const t = useTranslations();
  const [next, setNext] = useState(status);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const changed = next !== status;

  return (
    <div className="space-y-2">
      <Select value={next} onChange={(e) => setNext(e.target.value as AssetStatus)} className="h-9">
        {Object.values(AssetStatus).map((s) => (
          <option key={s} value={s}>
            {t(`assetStatus.${s}`)}
          </option>
        ))}
      </Select>
      {changed && (
        <>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("assets.statusNote")} className="h-9" />
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await setAssetStatusAction(id, next, note);
                setNote("");
              })
            }
          >
            {t("assets.updateStatus")}
          </Button>
        </>
      )}
    </div>
  );
}
