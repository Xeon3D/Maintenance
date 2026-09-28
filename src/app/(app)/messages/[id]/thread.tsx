"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, LogOut, Send } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { MentionTextarea, type MentionMember } from "@/components/mention-textarea";
import { cn } from "@/lib/utils";
import { leaveConversationAction, markReadAction, sendMessageAction } from "../actions";

export type ChatMessage = { id: string; userId: string; name: string; body: string; at: number; time: string };

const POLL_MS = 4000;
const GROUP_GAP_MS = 5 * 60_000;

export function Thread({
  id,
  title,
  subtitle,
  canLeave,
  me,
  members,
  messages,
  truncated,
  labels,
}: {
  id: string;
  title: string;
  subtitle: string | null;
  canLeave: boolean;
  me: string;
  members: MentionMember[];
  messages: ChatMessage[];
  truncated: boolean;
  labels: { placeholder: string };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // follow new messages unless the user scrolled up
  const lastId = messages.at(-1)?.id;

  // Live updates: re-render from the server while the tab is visible.
  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [router]);

  // Keep the view at the bottom and mark what's shown as read.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
    if (lastId) void markReadAction(id);
  }, [id, lastId]);

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;
    setError(false);
    start(async () => {
      const res = await sendMessageAction(id, text);
      if (res.error) {
        setError(true);
        return;
      }
      setBody("");
      stick.current = true;
      router.refresh();
    });
  };

  return (
    <Card className="flex h-[70vh] min-h-96 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Link href="/messages" className="-ml-1 rounded p-1 text-muted hover:bg-gray-100 lg:hidden" aria-label={t("nav.messages")}>
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {canLeave && (
          <button
            title={t("messages.leave")}
            className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-danger"
            onClick={() => confirm(t("messages.leaveConfirm")) && start(() => leaveConversationAction(id))}
          >
            <LogOut className="size-4" />
          </button>
        )}
      </div>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-1 overflow-y-auto px-4 py-3"
      >
        {truncated && <p className="pb-2 text-center text-xs text-muted">{t("messages.olderHidden")}</p>}
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("messages.firstMessage")}</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const head = !prev || prev.userId !== m.userId || m.at - prev.at > GROUP_GAP_MS;
          const mine = m.userId === me;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start", head && "pt-2")}>
              {head && (
                <div className="mb-0.5 text-xs text-muted">
                  {!mine && <span className="mr-1.5 font-medium text-foreground">{m.name}</span>}
                  {m.time}
                </div>
              )}
              <p
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm",
                  mine ? "bg-brand text-brand-foreground" : "bg-gray-100",
                )}
              >
                {m.body}
              </p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <MentionTextarea
              value={body}
              onValueChange={setBody}
              members={members}
              onEnter={send}
              placeholder={labels.placeholder}
              rows={1}
              maxLength={5000}
              className="min-h-10 resize-none"
            />
          </div>
          <Button onClick={send} disabled={pending || !body.trim()} aria-label={t("activity.send")}>
            <Send className="size-4" />
          </Button>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{t("common.somethingWrong")}</p>}
        <p className="mt-1 hidden text-xs text-muted sm:block">{t("messages.composerHint")}</p>
      </div>
    </Card>
  );
}
