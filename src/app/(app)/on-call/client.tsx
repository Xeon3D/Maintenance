"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui";
import { setOnCallMemberAction, setOnCallWeekAction } from "./actions";

export function WeekSelect({ week, value, options, label }: { week: string; value: string; options: { id: string; name: string }[]; label: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  return (
    <Select
      aria-label={label}
      className="h-8 w-full min-w-0"
      value={shown}
      disabled={pending}
      onChange={(e) => {
        const userId = e.target.value;
        start(async () => {
          setShown(userId);
          await setOnCallWeekAction(week, userId);
        });
      }}
    >
      <option value="">{t("onCall.nobody")}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </Select>
  );
}

export function MemberToggle({ userId, checked, name }: { userId: string; checked: boolean; name: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(checked);
  return (
    <input
      type="checkbox"
      aria-label={t("onCall.inTeam", { name })}
      className="size-4 accent-brand"
      checked={shown}
      disabled={pending}
      onChange={(e) => {
        const on = e.target.checked;
        if (!on && !confirm(t("onCall.removeConfirm", { name }))) return;
        start(async () => {
          setShown(on);
          await setOnCallMemberAction(userId, on);
        });
      }}
    />
  );
}
