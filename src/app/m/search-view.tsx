"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CloudOff, Loader2, Search } from "lucide-react";
import { SearchResults } from "@/components/search-results";
import type { SearchResult } from "@/lib/search";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "offline" }
  | { kind: "error" }
  | { kind: "done"; results: SearchResult[]; truncated: boolean; empty: boolean };

/**
 * Search past work orders and technicians' notes (lib/search.ts through /api/search). It needs a connection:
 * the device only keeps the user's own open jobs. Results that are on the device open in the field app.
 */
export function SearchView({ initial, onDevice, onBack }: { initial: string; onDevice: Set<string>; onBack: () => void }) {
  const t = useTranslations();
  const [q, setQ] = useState(initial);
  const [state, setState] = useState<State>({ kind: "idle" });
  const request = useRef(0);
  // Under two letters there is nothing to search: show the hint, whatever the last search returned.
  const shown: State = q.trim().length < 2 ? { kind: "idle" } : state;

  useEffect(() => {
    const query = q.trim();
    // Keep the words in the URL, so coming back from a result shows the same search.
    history.replaceState(null, "", `#search=${encodeURIComponent(query)}`);
    if (query.length < 2) return;
    const id = ++request.current;
    const timer = setTimeout(async () => {
      if (!navigator.onLine) return setState({ kind: "offline" });
      setState({ kind: "loading" });
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers: { accept: "application/json" } });
        if (!res.ok || !res.headers.get("content-type")?.includes("json")) throw new Error(String(res.status));
        const data = (await res.json()) as { terms: string[]; results: SearchResult[]; truncated: boolean };
        if (id === request.current) setState({ kind: "done", results: data.results, truncated: data.truncated, empty: data.terms.length === 0 });
      } catch {
        if (id === request.current) setState({ kind: navigator.onLine ? "error" : "offline" });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <main className="px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onBack} className="-ml-2 rounded-md p-2 hover:bg-gray-100" aria-label={t("search.back")} title={t("search.back")}>
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-semibold">{t("search.title")}</h1>
      </div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          enterKeyHint="search"
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {shown.kind === "loading" && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-label={t("search.searching")} />}
      </form>

      {shown.kind === "idle" ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted">{t("search.hint")}</p>
      ) : shown.kind === "offline" ? (
        <p className="flex items-center justify-center gap-2 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          <CloudOff className="size-4 shrink-0" />
          {t("search.offline")}
        </p>
      ) : shown.kind === "error" ? (
        <p className="rounded-md bg-red-50 p-4 text-center text-sm text-red-800">{t("common.somethingWrong")}</p>
      ) : shown.kind === "done" ? (
        shown.results.length === 0 ? (
          <p className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted">{shown.empty ? t("search.hint") : t("search.none")}</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">
              {shown.truncated ? t("search.countTop", { count: shown.results.length }) : t("search.count", { count: shown.results.length })}
            </p>
            <SearchResults compact results={shown.results} linkFor={(id) => (onDevice.has(id) ? `#wo=${id}` : `/work-orders/${id}`)} />
          </>
        )
      ) : null}
    </main>
  );
}
