import { useState } from "react";
import { Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import { chatMessages as initial } from "@/data/mockData";

type Message = { role: "ai" | "user"; content: string };

const aiReplies = [
  "What's the most overdue thing on your plate right now?",
  "When did you last feel like you made real progress? Let's start there.",
  "Sounds like you might be overthinking this. Want me to break it into 3 concrete steps?",
  "I noticed you left the workspace sync task mid-way yesterday. Want to pick that back up?",
];

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    const aiMsg: Message = {
      role: "ai",
      content: aiReplies[messages.length % aiReplies.length],
    };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-display text-foreground mb-6">Ask Momentum</h1>

      <div className="space-y-4 mb-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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
