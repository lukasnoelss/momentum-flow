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
      {/* Hero Header */}
      <div className="flex items-center justify-between mb-8 md:mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-display text-foreground">
            {greeting()}, {userName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your momentum today</p>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary text-primary px-3 py-1.5 rounded-full">
          <Flame className="w-4 h-4" />
          <span className="text-sm font-semibold">{streakDays} day streak</span>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 mb-6">
        {/* Left column — Focus score + AI memory */}
        <div className="md:col-span-5 space-y-5">
          <div className="bg-card rounded-2xl border border-border p-6">
            <FocusScore score={score} label={focusLabel(score)} />
          </div>
          <ContextBar message={aiMemory} />
        </div>

        {/* Right column — Tasks */}
        <div className="md:col-span-7 space-y-5">
          <FeaturedTask {...featuredTask} />
          <SecondaryTasks tasks={secondaryTasks} />
        </div>
      </div>

      {/* Ask bar */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask Momentum anything…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button onClick={handleAsk} className="text-primary hover:text-primary/80 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </AppShell>
  );
};

export default Index;
