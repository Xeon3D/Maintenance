import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MessagesSquare } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default async function MessagesPage() {
  const t = await getTranslations("messages");
  return (
    <Card className="hidden flex-col items-center px-6 py-16 text-center lg:flex">
      <MessagesSquare className="mb-3 size-8 text-muted" />
      <p className="font-medium">{t("pick")}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{t("pickHint")}</p>
      <Link href="/messages/new" className="mt-4">
        <Button variant="secondary">{t("new")}</Button>
      </Link>
    </Card>
  );
}
