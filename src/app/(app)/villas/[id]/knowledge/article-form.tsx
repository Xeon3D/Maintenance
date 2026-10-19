import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input, Select } from "@/components/ui";
import { MarkdownEditor } from "@/components/knowledge/markdown-editor";
import { SystemType } from "@/generated/prisma/enums";
import { saveArticleAction } from "./actions";

type Article = { id: string; title: string; body: string; system: SystemType | null; pinned: boolean; assets: { id: string }[] };

export async function ArticleForm({
  villaId,
  article,
  assets,
  defaults,
}: {
  villaId: string;
  article?: Article;
  /** The villa's assets, to link the article to. */
  assets: { id: string; name: string; system: SystemType; area: string | null }[];
  /** Prefill for a new article (e.g. opened from an asset page). */
  defaults?: { assetId?: string; system?: SystemType };
}) {
  const t = await getTranslations();
  const linked = new Set(article?.assets.map((a) => a.id) ?? (defaults?.assetId ? [defaults.assetId] : []));
  return (
    <ActionForm action={saveArticleAction.bind(null, villaId, article?.id ?? null)} submitLabel={article ? t("common.save") : t("common.create")}>
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label={t("knowledge.articleTitle")}>
          <Input name="title" defaultValue={article?.title} placeholder={t("knowledge.titlePlaceholder")} required maxLength={200} />
          <FieldError name="title" />
        </Field>
        <Field label={t("knowledge.system")}>
          <Select name="system" defaultValue={article?.system ?? defaults?.system ?? ""}>
            <option value="">{t("knowledge.general")}</option>
            {Object.values(SystemType).map((s) => (
              <option key={s} value={s}>
                {t(`systems.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("knowledge.body")}>
        <MarkdownEditor name="body" defaultValue={article?.body ?? ""} />
        <FieldError name="body" />
      </Field>
      {assets.length > 0 && (
        <Field label={t("knowledge.assets")} hint={t("knowledge.assetsHint")}>
          <div className="grid max-h-56 gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
            {assets.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="assetIds" value={a.id} defaultChecked={linked.has(a.id)} className="size-4" />
                <span className="truncate">
                  {a.name}
                  <span className="text-xs text-muted">
                    {" "}
                    · {t(`systems.${a.system}`)}
                    {a.area && ` · ${a.area}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Field>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="pinned" defaultChecked={article?.pinned ?? false} className="mt-0.5 size-4" />
        <span>
          {t("knowledge.pin")}
          <span className="block text-xs text-muted">{t("knowledge.pinHint")}</span>
        </span>
      </label>
    </ActionForm>
  );
}
