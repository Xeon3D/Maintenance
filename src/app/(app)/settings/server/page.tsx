import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { getContext } from "@/lib/context";
import { isServerAdmin, serverAdminEnabled } from "@/lib/server-admin";
import { DEFAULT_APP_NAME, getServerSettings } from "@/lib/server-settings";
import { backupsAvailable, busyState, listBackups } from "@/lib/backups";
import { checkForUpdate, updaterConfigured } from "@/lib/updates";
import { factoryResetEnabled } from "@/lib/factory-reset";
import { TIMEZONES } from "@/lib/timezones";
import { SCHEDULED_KINDS } from "@/lib/backup-schedule";
import { checkUpdatesAction, lockAction, saveGeneralAction, saveScheduleAction, unlockAction } from "./actions";
import { BackupNowButton, BackupsTable, UpdateButton, UploadBackup } from "./panel";

export const metadata = { title: "Server" };

export default async function ServerSettingsPage() {
  const ctx = await getContext();
  if (!ctx.can("org.manage")) notFound();
  const t = await getTranslations();
  const header = <PageHeader title={t("server.title")} description={t("server.description")} />;

  if (!serverAdminEnabled()) {
    return (
      <>
        {header}
        <Card className="max-w-2xl p-6 text-sm text-muted">{t("server.disabled")}</Card>
      </>
    );
  }

  if (!(await isServerAdmin(ctx.user.id))) {
    return (
      <>
        {header}
        <Card className="max-w-md p-6">
          <h2 className="mb-1 font-medium">{t("server.locked")}</h2>
          <p className="mb-4 text-sm text-muted">{t("server.lockedHint")}</p>
          <ActionForm action={unlockAction} submitLabel={t("server.unlock")}>
            <Field label={t("server.password")}>
              <Input name="password" type="password" autoComplete="off" required autoFocus />
            </Field>
          </ActionForm>
        </Card>
      </>
    );
  }

  const [settings, update, backups] = await Promise.all([getServerSettings(), checkForUpdate(), listBackups()]);
  const s = settings.backups;
  const available = backupsAvailable();
  const busy = busyState();
  const tzOptions = TIMEZONES.includes(s.timezone) ? TIMEZONES : [s.timezone, ...TIMEZONES];
  const intlLocale = ctx.user.locale === "pt" ? "pt-PT" : "en-GB";
  const dateFmt = new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone });
  const dayFmt = new Intl.DateTimeFormat(intlLocale, { dateStyle: "long", timeZone: s.timezone });

  return (
    <>
      <PageHeader
        title={t("server.title")}
        description={t("server.description")}
        actions={
          <form action={lockAction}>
            <Button variant="secondary" size="sm">
              {t("server.lock")}
            </Button>
          </form>
        }
      />
      <div className="max-w-4xl space-y-6">
        {/* ── General */}
        <Card className="p-6">
          <h2 className="mb-4 font-medium">{t("server.general")}</h2>
          <ActionForm action={saveGeneralAction} successMessage={t("common.saved")}>
            <Field label={t("server.appName")} hint={t("server.appNameHint", { default: DEFAULT_APP_NAME })}>
              <Input name="appName" defaultValue={settings.appName ?? ""} placeholder={process.env.APP_NAME || DEFAULT_APP_NAME} maxLength={40} className="max-w-sm" />
              <FieldError name="appName" />
            </Field>
          </ActionForm>
        </Card>

        {/* ── Updates */}
        <Card className="p-6">
          <h2 className="mb-4 font-medium">{t("server.updates")}</h2>
          <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">{t("server.currentVersion")}</dt>
            <dd className="font-medium">{update.current}</dd>
            <dt className="text-muted">{t("server.latestVersion")}</dt>
            <dd>
              {update.latest ? (
                <span className="flex flex-wrap items-center gap-2">
                  <a href={update.latest.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                    {update.latest.version}
                  </a>
                  {update.available ? <Badge className="bg-amber-50 text-amber-800">{t("server.updateAvailable")}</Badge> : <Badge className="bg-green-50 text-green-800">{t("server.upToDate")}</Badge>}
                </span>
              ) : (
                <span className="text-muted">{t("server.unknown")}</span>
              )}
              {update.error && <span className="block text-xs text-danger">{t("server.checkFailed")}</span>}
              {update.checkedAt && <span className="block text-xs text-muted">{t("server.checkedAt", { date: dateFmt.format(update.checkedAt) })}</span>}
            </dd>
          </dl>
          <div className="flex flex-wrap items-start gap-3">
            {update.available && updaterConfigured() && <UpdateButton current={update.current} latest={update.latest!.version} />}
            <form action={checkUpdatesAction}>
              <Button variant="secondary">{t("server.checkNow")}</Button>
            </form>
          </div>
          {!updaterConfigured() && <p className="mt-4 text-xs text-muted">{t("server.updaterMissing")}</p>}
          {update.available && updaterConfigured() && <p className="mt-4 text-xs text-muted">{t("server.updateNote")}</p>}
          {update.changelog.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="mb-3 text-sm font-medium">{t("server.whatsNew")}</h3>
              <div className="max-h-[28rem] space-y-6 overflow-y-auto pr-2">
                {update.changelog.map((r) => (
                  <section key={r.version}>
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                      <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                        {r.version}
                      </a>
                      {r.publishedAt && <span className="text-xs text-muted">{dayFmt.format(new Date(r.publishedAt))}</span>}
                    </div>
                    {r.html ? (
                      // Release notes as rendered and sanitized by GitHub, cleaned again in cleanReleaseHtml().
                      <div className="release-notes text-sm" dangerouslySetInnerHTML={{ __html: r.html }} />
                    ) : (
                      <p className="text-sm text-muted">{t("server.noNotes")}</p>
                    )}
                  </section>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── Backups */}
        <Card>
          <div className="p-6 pb-4">
            <h2 className="mb-1 font-medium">{t("server.backups")}</h2>
            <p className="text-sm text-muted">{t("server.backupsHint")}</p>
            {!available && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{t("server.backupsUnavailable")}</p>}
            {busy && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">{t(`server.busy.${busy.op}`)}</p>}
          </div>

          <div className="border-t border-border p-6">
            <h3 className="mb-3 text-sm font-medium">{t("server.schedule")}</h3>
            <ActionForm action={saveScheduleAction} successMessage={t("common.saved")}>
              <div className="grid gap-3 sm:grid-cols-3">
                {SCHEDULED_KINDS.map((k) => (
                  <div key={k} className="rounded-md border border-border p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" name={k} defaultChecked={s[k].enabled} className="size-4 accent-[var(--brand)]" />
                      {t(`server.kinds.${k}`)}
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                      {t("server.keep")}
                      <Input name={`${k}Keep`} type="number" min={1} max={500} defaultValue={s[k].keep} className="h-8 w-20" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("server.runAt")} hint={t("server.runAtHint")}>
                  <Select name="hour" defaultValue={s.hour}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("settings.timezone")}>
                  <Select name="timezone" defaultValue={s.timezone}>
                    {tzOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                  <FieldError name="timezone" />
                </Field>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="autoUpdate" defaultChecked={settings.autoUpdate} disabled={!updaterConfigured()} className="mt-0.5 size-4 accent-[var(--brand)]" />
                <span>
                  <span className="font-medium">{t("server.autoUpdate")}</span>
                  <span className="block text-xs text-muted">{t("server.autoUpdateHint")}</span>
                </span>
              </label>
            </ActionForm>
          </div>

          <div className="flex flex-wrap items-start gap-3 border-t border-border p-6">
            <BackupNowButton disabled={!available || !!busy} />
            <UploadBackup disabled={!available || !!busy} />
          </div>

          <div className="border-t border-border">
            <BackupsTable
              rows={backups.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }))}
              current={update.current}
              canRestore={available && !busy}
              timezone={s.timezone}
            />
          </div>
        </Card>

        {factoryResetEnabled() && (
          <Card className="border-red-200 p-6">
            <h2 className="mb-1 font-medium text-danger">{t("auth.factoryResetTitle")}</h2>
            <p className="mb-3 text-sm text-muted">{t("auth.factoryResetBody")}</p>
            <Link href="/factory-reset" className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-danger hover:bg-red-50">
              {t("auth.factoryResetButton")}
            </Link>
          </Card>
        )}
      </div>
    </>
  );
}
