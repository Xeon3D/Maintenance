"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Select } from "@/components/ui";
import { addOnCallWeekAction, removeOnCallWeekAction, setOnCallMemberAction } from "./actions";

type Person = { id: string; name: string; color?: string };

/** The people on call one week: a chip each (× takes them off) and a picker to add someone from the team. */
export function WeekPeople({ week, people, team, label }: { week: string; people: Person[]; team: Person[]; label: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [shown, change] = useOptimistic(people, (list: Person[], op: { add?: Person; remove?: string }) =>
    op.add ? [...list, op.add] : list.filter((p) => p.id !== op.remove),
  );
  const free = team.filter((p) => !shown.some((s) => s.id === p.id));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-border py-0.5 pl-2 pr-1 text-xs">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? "var(--color-muted)" }} />
          {p.name}
          <button
            type="button"
            disabled={pending}
            aria-label={t("onCall.removeFromWeek", { name: p.name })}
            className="rounded-full p-0.5 text-muted hover:bg-gray-100 hover:text-foreground"
            onClick={() =>
              start(async () => {
                change({ remove: p.id });
                await removeOnCallWeekAction(week, p.id);
              })
            }
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {free.length > 0 && (
        <Select
          aria-label={label}
          className="h-7 w-auto min-w-0 py-0 text-xs"
          value=""
          disabled={pending}
          onChange={(e) => {
            const add = free.find((p) => p.id === e.target.value);
            if (add)
              start(async () => {
                change({ add });
                await addOnCallWeekAction(week, add.id);
              });
          }}
        >
          <option value="">+ {t("onCall.add")}</option>
          {free.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}
      {shown.length === 0 && free.length === 0 && <span className="text-xs text-muted">{t("onCall.nobody")}</span>}
    </div>
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
