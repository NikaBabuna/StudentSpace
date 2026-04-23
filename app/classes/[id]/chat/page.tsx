"use client";

import { useState, useEffect, useRef, use } from "react";
import { createClient } from "@/utils/supabase/client";

type Role = "tutor" | "student" | "parent" | "employer";

interface Message {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: {
    full_name: string;
    is_employer: boolean;
  };
  memberRole?: Role;
}

const roleColors: Record<string, { bg: string; text: string }> = {
  tutor:    { bg: "#3a2e1a", text: "#e8c87a" },
  student:  { bg: "#2a1e10", text: "#e8a060" },
  parent:   { bg: "#10203a", text: "#60a8e8" },
  employer: { bg: "#1a2a10", text: "#80c060" },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "short",
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

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params);
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Record<string, Role>>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      // Fetch class members for role lookup
      const { data: memberRows } = await supabase
        .from("class_members")
        .select("user_id, role")
        .eq("class_id", classId);

      const memberMap: Record<string, Role> = {};
      for (const m of memberRows ?? []) {
        memberMap[m.user_id] = m.role;
      }
      setMembers(memberMap);

      // Fetch messages
      const { data: msgs } = await supabase
        .from("messages")
        .select(`
          id,
          body,
          created_at,
          author_id,
          author:users!messages_author_id_fkey (
            full_name,
            is_employer
          )
        `)
        .eq("class_id", classId)
        .order("created_at", { ascending: true });

      setMessages((msgs ?? []) as any);
      setLoading(false);
    }

    load();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${classId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `class_id=eq.${classId}` },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from("messages")
            .select(`
              id,
              body,
              created_at,
              author_id,
              author:users!messages_author_id_fkey (
                full_name,
                is_employer
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMsg) {
            setMessages((prev) => [...prev, newMsg as any]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [classId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("messages").insert({
      class_id: classId,
      author_id: user.id,
      body: text,
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const grouped = groupByDate(messages);

  // Unique participants
  const participantIds = [...new Set(messages.map((m) => m.author_id))];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 112px)" }}>

      {/* Participants bar */}
      <div
        className="flex items-center gap-2 px-6 py-2 shrink-0 flex-wrap"
        style={{ borderBottom: "0.5px solid #2a2820" }}
      >
        <span className="text-[11px] mr-1" style={{ color: "var(--color-ss-text-ghost)" }}>
          In this chat:
        </span>
        {Object.entries(members).map(([userId, role]) => {
          const msg = messages.find((m) => m.author_id === userId);
          const name = (msg?.author as any)?.full_name ?? role;
          const colors = roleColors[role] ?? roleColors.tutor;
          return (
            <div
              key={userId}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
              style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)", color: colors.text }}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.text }} />
              {name}
            </div>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-1">
        {loading && (
          <div className="text-center text-[13px] mt-8" style={{ color: "var(--color-ss-text-ghost)" }}>
            Loading…
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center text-[13px] mt-8" style={{ color: "var(--color-ss-text-ghost)" }}>
            No messages yet. Say something!
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px" style={{ background: "#2a2820" }} />
              <span className="text-[10px] shrink-0" style={{ color: "#4a4840" }}>{group.date}</span>
              <div className="flex-1 h-px" style={{ background: "#2a2820" }} />
            </div>

            {group.messages.map((msg) => {
              const isMe = msg.author_id === currentUser;
              const role = members[msg.author_id] ?? "student";
              const colors = roleColors[role] ?? roleColors.tutor;
              const name = (msg.author as any)?.full_name ?? "Unknown";
              const time = new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

              return (
                <div key={msg.id} className={`flex gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[9px] font-medium shrink-0 mt-1"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {getInitials(name)}
                  </div>
                  <div className={`max-w-[68%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-[11px] font-medium" style={{ color: colors.text }}>{name}</span>
                      <span className="text-[10px]" style={{ color: "var(--color-ss-text-ghost)" }}>{time}</span>
                    </div>
                    <div
                      className="px-3 py-1.5 rounded-xl text-[13px] leading-relaxed"
                      style={{
                        background: isMe ? "#2a2318" : "var(--color-ss-bg-secondary)",
                        border: `0.5px solid ${isMe ? "#4a3a20" : "var(--color-ss-border)"}`,
                        color: isMe ? "#e0cca0" : "#c8b890",
                      }}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 shrink-0" style={{ borderTop: "0.5px solid #2a2820" }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Write a message…"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: "#c8b890" }}
          />
          <button
            onClick={sendMessage}
            className="text-[12px] font-medium px-3 py-1.5 rounded-md shrink-0"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
          >
            Send
          </button>
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: "var(--color-ss-text-ghost)" }}>
          Press Enter to send
        </div>
      </div>
    </div>
  );
}