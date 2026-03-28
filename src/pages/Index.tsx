import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import FocusScore from "@/components/FocusScore";
import ContextBar from "@/components/ContextBar";
import FeaturedTask from "@/components/FeaturedTask";
import SecondaryTasks from "@/components/SecondaryTasks";
import {
  userName,
  streakDays,
  initialFocusScore,
  focusLabel,
  aiMemory,
  featuredTask,
  secondaryTasks,
} from "@/data/mockData";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const Index = () => {
  const [score, setScore] = useState(initialFocusScore);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => {
      setScore((s) => Math.max(0, Math.min(100, s + Math.round((Math.random() - 0.5) * 6))));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleAsk = () => {
    if (!input.trim()) return;
    navigate("/chat");
    setInput("");
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-foreground">
            {greeting()}, {userName}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <Flame className="w-4 h-4" />
          <span className="text-sm font-semibold">{streakDays}d</span>
        </div>
      </div>

      {/* Focus Score */}
      <FocusScore score={score} label={focusLabel(score)} />

      {/* AI Memory */}
      <div className="mb-5">
        <ContextBar message={aiMemory} />
      </div>

      {/* Featured Task */}
      <div className="mb-5">
        <FeaturedTask {...featuredTask} />
      </div>

      {/* Secondary Tasks */}
      <div className="mb-6">
        <SecondaryTasks tasks={secondaryTasks} />
      </div>

      {/* Ask bar */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask Momentum anything…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button onClick={handleAsk} className="text-primary">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </AppShell>
  );
};

export default Index;
