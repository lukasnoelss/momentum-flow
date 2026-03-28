import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useMemory } from "@/hooks/useApi";

type Message = { role: "ai" | "user"; content: string };

const Chat = () => {
  const { data: memoryData, isLoading } = useMemory();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [seeded, setSeeded] = useState(false);

  // Seed chat with real memory summary once loaded
  useEffect(() => {
    if (seeded || isLoading) return;
    const summary = memoryData?.memory_summary;
    const seed: Message = {
      role: "ai",
      content: summary
        ? `Here's what I remember from your last session:\n\n${summary}\n\nWhat would you like to focus on today?`
        : "Hey! Run the tab reader to get your first focus analysis, then I'll have context about your work.",
    };
    setMessages([seed]);
    setSeeded(true);
  }, [memoryData, isLoading, seeded]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    // Echo back a nudge based on memory context
    const memory = memoryData?.memory_summary ?? "";
    const nudge = memory
      ? `Based on your recent session, ${memory.split(".")[0].toLowerCase()}. What's your next concrete step?`
      : "What's the most overdue thing on your plate right now?";
    const aiMsg: Message = { role: "ai", content: nudge };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-display text-foreground mb-6">Ask Momentum</h1>

      <div className="space-y-4 mb-6">
        {isLoading && messages.length === 0 && (
          <p className="text-muted-foreground text-sm animate-pulse">Loading your session memory…</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                m.role === "ai"
                  ? "bg-surface-sunken text-foreground border-l-2 border-primary"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="What's on your mind?"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button onClick={send} className="text-primary">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </AppShell>
  );
};

export default Chat;
