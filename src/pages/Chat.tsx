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

  // Seed chat with dynamic proactive coaching from Gemini once on mount
  useEffect(() => {
    if (seeded) return;
    setSeeded(true);
    
    chatMutation.mutate(
      { messages: [] },
      {
        onSuccess: (data) => {
          setMessages([{ role: "ai", content: data.reply }]);
        },
        onError: () => {
          setMessages([{ role: "ai", content: "Hey! Something went wrong loading my initial focus analysis. What's on your mind?" }]);
        }
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeded]);

  const send = () => {
    if (!input.trim() || chatMutation.isPending) return;
    
    // Add the user's message immediately to the UI
    const userMsg: Message = { role: "user", content: input };
    const currMessages = [...messages, userMsg];
    setMessages(currMessages);
    setInput("");

    // Send the conversation history (minus the initial seed text which isn't strictly needed 
    // for context since the backend injects memory and tabs directly)
    chatMutation.mutate(
      { messages: currMessages },
      {
        onSuccess: (data) => {
          setMessages((m) => [...m, { role: "ai", content: data.reply }]);
        },
      }
    );
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
        {chatMutation.isPending && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-surface-sunken text-muted-foreground border-l-2 border-primary animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
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
