"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button, FormError, Table } from "@/components/ui";
import type { OnlineUser } from "@/lib/online-users";
import { onlineUsersAction } from "./actions";

export function OnlineUsers({ initial, minutes, timezone }: { initial: OnlineUser[]; minutes: number; timezone: string }) {
  const t = useTranslations("server.online");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const fmt = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: timezone });
  const time = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", { timeStyle: "short", timeZone: timezone });

  const refresh = () =>
    start(async () => {
      try {
        setRows(await onlineUsersAction());
        setError(false);
      } catch {
        setError(true);
      }
    });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 p-6 pb-4">
        <div>
          <h2 className="mb-1 font-medium">
            {t("title")} <span className="text-muted">({rows.length})</span>
          </h2>
          <p className="text-sm text-muted">{t("hint", { minutes })}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={pending}>
          <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
          {t("refresh")}
        </Button>
      </div>
      {error && (
        <div className="px-6 pb-4">
          <FormError message={tc("somethingWrong")} />
        </div>
      )}
      <div className="border-t border-border">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">{t("none")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("lastSeen")}</th>
                <th>{t("signedIn")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="block font-medium">{u.name}</span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </td>
                  <td className="whitespace-nowrap">{time.format(new Date(u.lastSeenAt))}</td>
                  <td className="whitespace-nowrap">{u.lastSignInAt ? fmt.format(new Date(u.lastSignInAt)) : <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
