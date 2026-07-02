/* =============================================================================
 * features/chat/components/ChatPage.tsx — realtime class chat UI
 * -----------------------------------------------------------------------------
 * Role: Displays message history and composer. Subscribes to Supabase Realtime
 *       for live updates; posts via postMessage server action. Class title,
 *       member count, and current user come from the server page — only the
 *       message list itself is fetched client-side (it must live where the
 *       Realtime subscription lives).
 * Dependencies: lib/supabase/client, features/chat/actions, components/ui
 * Used by: app/classes/[id]/chat/page.tsx
 * Inputs: classId, classTitle, memberCount, currentUserId (server props)
 * Outputs: Interactive chat panel inside the class layout
 * ========================================================================== */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { postMessage } from "@/features/chat/actions";

interface Message {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: {
    full_name: string;
    is_employer: boolean;
  } | null;
  /** Optimistically added locally; not yet confirmed by the server. */
  pending?: boolean;
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
  }
  return groups;
}

function authorName(msg: Message) {
  return msg.author?.full_name ?? "Unknown";
}

function shouldShowName(msg: Message, prev: Message | null, isMe: boolean) {
  if (isMe) return false;
  if (!prev) return true;
  return prev.author_id !== msg.author_id;
}

export default function ChatPage({
  classId,
  classTitle,
  memberCount,
  currentUserId,
}: {
  classId: string;
  classTitle: string;
  memberCount: number;
  currentUserId: string;
}) {
  // createBrowserClient returns a shared singleton, but memoise anyway so the
  // effect dependency below is referentially stable across renders.
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: msgs } = await supabase
        .from("messages")
        .select(
          `
          id,
          body,
          created_at,
          author_id,
          author:users!messages_author_id_fkey (
            full_name,
            is_employer
          )
        `
        )
        .eq("class_id", classId)
        .order("created_at", { ascending: true });

      setMessages((msgs ?? []) as Message[]);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`chat-${classId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `class_id=eq.${classId}` },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from("messages")
            .select(
              `
              id,
              body,
              created_at,
              author_id,
              author:users!messages_author_id_fkey (
                full_name,
                is_employer
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (newMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              // Drop the optimistic placeholder this real message confirms.
              const deduped = prev.filter((m) => !(m.pending && m.body === newMsg.body));
              return [...deduped, newMsg as Message];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    // Optimistic: show the bubble immediately, then confirm via the server +
    // the realtime echo. Self-bubbles never render a name, so a minimal row
    // (no author) is enough.
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      body: text,
      created_at: new Date().toISOString(),
      author_id: currentUserId,
      author: null,
      pending: true,
    };

    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await postMessage(classId, text);
    setSending(false);

    if (error) {
      // Roll back the bubble and restore the draft so nothing is lost.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const grouped = groupByDate(messages);
  const canSend = input.trim().length > 0 && !sending;

  return (
    <Card className="flex h-[min(520px,calc(100dvh-18rem))] flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-3.5">
        <span className="size-2 shrink-0 rounded-full bg-ok" aria-hidden />
        <span className="text-[15px] font-semibold text-ink">Class group · {classTitle}</span>
        <span className="ml-auto text-[13px] text-muted">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Spinner className="size-5 text-muted" />
          </div>
        ) : null}

        {!loading && messages.length === 0 ? (
          <EmptyState
            className="my-auto border-none bg-transparent py-10"
            title="No messages yet"
            description="Start the conversation — say hello to your class."
          />
        ) : null}

        {!loading && messages.length > 0
          ? grouped.map((group) => (
              <div key={group.date}>
                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-line" />
                  <span className="shrink-0 font-mono text-[10px] text-muted">{group.date}</span>
                  <div className="h-px flex-1 bg-line" />
                </div>

                <div className="flex flex-col gap-3.5">
                  {group.messages.map((msg, index) => {
                    const isMe = msg.author_id === currentUserId;
                    const name = authorName(msg);
                    const prev = index > 0 ? group.messages[index - 1] : null;
                    const showName = shouldShowName(msg, prev, isMe);
                    const time = new Date(msg.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex max-w-[78%] flex-col gap-1",
                          isMe ? "ml-auto items-end" : "items-start"
                        )}
                      >
                        {showName ? (
                          <span className="px-1 font-mono text-[11.5px] font-semibold text-muted">
                            {name}
                          </span>
                        ) : null}

                        <div className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}>
                          {!isMe ? <Avatar name={name} size="sm" className="size-7 text-[10px]" /> : null}
                          <div
                            className={cn(
                              "px-3.5 py-2.5 text-[15px] leading-relaxed transition-opacity",
                              isMe
                                ? "rounded-[15px_15px_5px_15px] bg-accent text-accent-ink"
                                : "rounded-[15px_15px_15px_5px] border border-line bg-surface-2 text-ink",
                              msg.pending && "opacity-60"
                            )}
                          >
                            {msg.body}
                          </div>
                        </div>

                        <span className="px-1 font-mono text-[10.5px] text-muted">{time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          : null}

        <div ref={bottomRef} />
      </div>

      <form
        className="flex shrink-0 items-center gap-2.5 border-t border-line px-4 py-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message your class…"
          className="flex-1 bg-surface-2"
          disabled={sending}
        />
        <Button type="submit" size="sm" disabled={!canSend} busy={sending}>
          Send
        </Button>
      </form>
    </Card>
  );
}
