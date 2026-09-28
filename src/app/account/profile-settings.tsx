import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Card, Field, Input } from "@/components/ui";
import { requireUser } from "@/lib/context";
import { vapidPublicKey } from "@/lib/push";
import { NOTIFICATION_TYPES, PORTAL_TYPES, prefsOf, type Channels } from "@/lib/notification-types";
import { changePasswordAction, updateProfileAction } from "./actions";
import { NotificationPrefs, PushControl } from "./notification-settings";

/** Profile, password and notification settings; `portal` limits the notification list to what clients get. */
export async function ProfileSettings({ portal = false }: { portal?: boolean }) {
  const user = await requireUser();
  const t = await getTranslations();
  const types = portal ? PORTAL_TYPES : NOTIFICATION_TYPES.filter((x) => x !== "REQUEST_UPDATE");
  const prefs = Object.fromEntries(types.map((type) => [type, prefsOf(user.notificationPrefs, type)])) as Record<string, Channels>;

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 font-medium">{t("profile.details")}</h2>
          <ActionForm action={updateProfileAction} successMessage={t("common.saved")}>
            <Field label={t("common.name")}>
              <Input name="name" defaultValue={user.name} required autoComplete="name" />
              <FieldError name="name" />
            </Field>
            <Field label={t("common.email")} hint={t("profile.emailHint")}>
              <Input value={user.email} readOnly disabled />
            </Field>
            <Field label={t("common.phone")}>
              <Input name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />
            </Field>
          </ActionForm>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-medium">{t("profile.password")}</h2>
          <ActionForm action={changePasswordAction} submitLabel={t("profile.changePassword")} successMessage={t("profile.passwordChanged")}>
            {user.passwordHash && (
              <Field label={t("profile.currentPassword")}>
                <Input name="current" type="password" autoComplete="current-password" required />
                <FieldError name="current" />
              </Field>
            )}
            <Field label={t("auth.newPassword")} hint={t("auth.passwordRule")}>
              <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
              <FieldError name="password" />
            </Field>
            <Field label={t("auth.confirmPassword")}>
              <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
              <FieldError name="confirm" />
            </Field>
          </ActionForm>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-1 font-medium">{t("profile.pushTitle")}</h2>
          <p className="mb-3 text-sm text-muted">{t("profile.pushHint")}</p>
          <PushControl vapidKey={vapidPublicKey()} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 font-medium">{t("profile.notifications")}</h2>
          <p className="mb-3 text-sm text-muted">{t("profile.notificationsHint")}</p>
          <NotificationPrefs types={types} initial={prefs} />
        </Card>
      </div>
    </div>
  );
}
