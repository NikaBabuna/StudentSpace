"use client";

import { useState, useRef, useEffect } from "react";

type Role = "tutor" | "student" | "parent" | "employer";

interface Message {
  id: string;
  sender: string;
  role: Role;
  initials: string;
  text: string;
  time: string;
  date: string;
}

const roleColors: Record<Role, { bg: string; text: string }> = {
  tutor:    { bg: "#3a2e1a", text: "#e8c87a" },
  student:  { bg: "#2a1e10", text: "#e8a060" },
  parent:   { bg: "#10203a", text: "#60a8e8" },
  employer: { bg: "#1a2a10", text: "#80c060" },
};

const initialMessages: Message[] = [
  { id: "1", sender: "Tutor",  role: "tutor",   initials: "TN", text: "Ana, I've posted the vectors worksheet. Please try exercises 3.1 and 3.2 before Thursday's lesson.", time: "09:14", date: "Monday, Apr 21" },
  { id: "2", sender: "Ana",    role: "student",  initials: "AS", text: "Got it! Should I show all the working or just the final answers?", time: "10:32", date: "Monday, Apr 21" },
  { id: "3", sender: "Tutor",  role: "tutor",   initials: "TN", text: "All working please — that's the important part.", time: "10:45", date: "Monday, Apr 21" },
  { id: "4", sender: "Parent", role: "parent",  initials: "P",  text: "Hello, just wanted to check — is the Thursday lesson still at 17:00?", time: "18:05", date: "Tuesday, Apr 22" },
  { id: "5", sender: "Tutor",  role: "tutor",   initials: "TN", text: "Yes, 17:00 as usual. See you then!", time: "18:20", date: "Tuesday, Apr 22" },
  { id: "6", sender: "Ana",    role: "student",  initials: "AS", text: "I'm stuck on 3.3, the angle part. Can we go over it at the start of the lesson?", time: "20:11", date: "Tuesday, Apr 22" },
  { id: "7", sender: "Tutor",  role: "tutor",   initials: "TN", text: "Of course, we'll start with that. Don't worry about it for now.", time: "20:30", date: "Tuesday, Apr 22" },
];

const participants: { label: string; role: Role }[] = [
  { label: "Tutor",    role: "tutor" },
  { label: "Ana",      role: "student" },
  { label: "Parent",   role: "parent" },
  { label: "Employer", role: "employer" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "Tutor",
        role: "tutor",
        initials: "TN",
        text,
        time,
        date: "Tuesday, Apr 22",
      },
    ]);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const last = grouped[grouped.length - 1];
    if (last && last.date === msg.date) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: msg.date, messages: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: "calc(100vh - 112px)" }}>

      {/* Participants bar */}
      <div className="flex items-center gap-2 px-6 py-2 shrink-0"
        style={{ borderBottom: "0.5px solid #2a2820" }}>
        <span className="text-[11px] mr-1" style={{ color: "var(--color-ss-text-ghost)" }}>In this chat:</span>
        {participants.map((p) => (
          <div key={p.role} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)", color: roleColors[p.role].text }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: roleColors[p.role].text }} />
            {p.label}
          </div>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-1">
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px" style={{ background: "#2a2820" }} />
              <span className="text-[10px] shrink-0" style={{ color: "#4a4840" }}>{group.date}</span>
              <div className="flex-1 h-px" style={{ background: "#2a2820" }} />
            </div>

            {/* Messages in group */}
            {group.messages.map((msg) => {
              const isMe = msg.role === "tutor";
              const colors = roleColors[msg.role];
              return (
                <div key={msg.id} className={`flex gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[9px] font-medium shrink-0 mt-1"
                    style={{ background: colors.bg, color: colors.text }}>
                    {msg.initials}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[68%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-[11px] font-medium" style={{ color: colors.text }}>{msg.sender}</span>
                      <span className="text-[10px]" style={{ color: "var(--color-ss-text-ghost)" }}>{msg.time}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl text-[13px] leading-relaxed"
                      style={{
                        background: isMe ? "#2a2318" : "var(--color-ss-bg-secondary)",
                        border: `0.5px solid ${isMe ? "#4a3a20" : "var(--color-ss-border)"}`,
                        color: isMe ? "#e0cca0" : "#c8b890",
                      }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 shrink-0" style={{ borderTop: "0.5px solid #2a2820" }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
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