"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { qrTokenOf, Scanner } from "@/components/scanner";

/** Opens the camera straight away; a label QR goes to its asset, a barcode/SKU to its part or asset. */
export function ScanLauncher() {
  const t = useTranslations("scan");
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [notFound, setNotFound] = useState<string | null>(null);

  const onResult = useCallback(
    async (text: string) => {
      setOpen(false);
      setNotFound(null);
      const token = qrTokenOf(text);
      if (token) return router.push(`/r/${token}`);
      const res = await fetch(`/api/scan?code=${encodeURIComponent(text)}`).catch(() => null);
      const match = res?.ok ? (await res.json()).match : null;
      if (match) router.push(match.href);
      else setNotFound(text);
    },
    [router],
  );

  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <ScanLine className="mb-3 size-8 text-muted" />
      {notFound && <p className="mb-3 text-sm text-danger">{t("notFound", { code: notFound })}</p>}
      <Button onClick={() => setOpen(true)}>{t("again")}</Button>
      {open && <Scanner onResult={onResult} onClose={() => setOpen(false)} />}
    </Card>
  );
}
