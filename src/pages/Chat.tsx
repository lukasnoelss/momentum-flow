import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useChat } from "@/hooks/useApi";

type Message = { role: "ai" | "user"; content: string };

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [seeded, setSeeded] = useState(false);
  const chatMutation = useChat();

  useEffect(() => {
    if (seeded) return;
    setSeeded(true);
    chatMutation.mutate(
      { messages: [] },
      {
        onSuccess: (data) => setMessages([{ role: "ai", content: data.reply }]),
        onError: () => setMessages([{ role: "ai", content: "Hey! Something went wrong. What's on your mind?" }]),
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeded]);

  const send = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMsg: Message = { role: "user", content: input };
    const curr = [...messages, userMsg];
    setMessages(curr);
    setInput("");
    chatMutation.mutate({ messages: curr }, { onSuccess: (data) => setMessages((m) => [...m, { role: "ai", content: data.reply }]) });
  };

  return (
    <AppShell>
      <h1 className="text-xl font-display text-foreground mb-5">Ask Momentum</h1>
      <div className="space-y-3 mb-8">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-line ${
              m.role === "ai"
                ? "bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] text-foreground border-l-2 border-primary"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start animate-fade-in">
            <div className="rounded-2xl px-4 py-3 bg-primary/[0.06] border-l-2 border-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
      {/* Floating input */}
      <div className="sticky bottom-20 z-40">
        <div className="flex items-center gap-2 bg-card/80 backdrop-blur-xl rounded-full px-5 py-3.5 border border-border/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(108,93,211,0.15)]">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="What's on your mind?" className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium" />
          <button onClick={send} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/30">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </AppShell>
  );
};

export default Chat;
