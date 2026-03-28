import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Send, Wifi, WifiOff, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import FocusScore from "@/components/FocusScore";
import ContextBar from "@/components/ContextBar";
import FeaturedTask from "@/components/FeaturedTask";
import SecondaryTasks from "@/components/SecondaryTasks";
import { useFocus, useMemory, useSessions, useScan, focusLabel } from "@/hooks/useApi";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/** Count how many consecutive days (including today) have at least one session. */
const computeStreak = (timestamps: string[]): number => {
  if (timestamps.length === 0) return 0;
  const daySet = new Set(
    timestamps.map((ts) => new Date(ts).toISOString().slice(0, 10))
  );
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!daySet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return Math.max(streak, timestamps.length > 0 ? 1 : 0);
};

const Index = () => {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const { data: focus, isError: focusError, isLoading: focusLoading } = useFocus();
  const { data: memory } = useMemory();
  const { data: sessionsData } = useSessions();
  const scanMutation = useScan();

  const sessions = sessionsData?.sessions ?? [];
  const latest = sessions[0] ?? null;

  const score = focus?.focus_score ?? null;
  const label = score !== null ? focusLabel(score) : (focus?.focus_label ?? "—");
  const memoryText =
    memory?.memory_summary ??
    "Run the tab reader to get your first focus analysis.";

  const streakDays = computeStreak(sessions.map((s) => s.timestamp));

  // Build secondary task list from older sessions (skip the latest — it's the featured card)
  const secondaryTasks = sessions.slice(1).map((s, i) => ({
    id: String(i),
    workingOn: s.working_on,
    focusScore: s.focus_score,
    focusLabel: s.focus_label,
    done: false,
  }));

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
            {greeting()}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your momentum today</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Scan button */}
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            title="Force a new tab scan now"
          >
            <RefreshCw className={`w-3 h-3 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{scanMutation.isPending ? "Scanning..." : "Update data"}</span>
          </button>
          
          {/* Live indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              focusError
                ? "bg-score-low/10 text-score-low"
                : "bg-secondary text-primary"
            }`}
            title={focusError ? "Backend unreachable" : "Live — polling every 15s"}
          >
            {focusError ? (
              <WifiOff className="w-3 h-3" />
            ) : (
              <Wifi className="w-3 h-3" />
            )}
            <span>{focusError ? "Offline" : "Live"}</span>
          </div>
          {streakDays > 0 && (
            <div className="flex items-center gap-1.5 bg-secondary text-primary px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-semibold">{streakDays} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 mb-6">
        {/* Left column — Focus score + AI memory */}
        <div className="md:col-span-5 space-y-5">
          <div className="bg-card rounded-2xl border border-border p-6">
            {focusLoading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm animate-pulse">
                Waiting for first scan…
              </div>
            ) : (
              <FocusScore score={score ?? 0} label={label} />
            )}
            {focus?.tab_count ? (
              <p className="text-xs text-muted-foreground text-center mt-3">
                {focus.tab_count} tab{focus.tab_count !== 1 ? "s" : ""} analysed
                {focus.updated_at
                  ? ` · ${new Date(focus.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
              </p>
            ) : null}
          </div>
          <ContextBar message={memoryText} />
        </div>

        {/* Right column — Tasks */}
        <div className="md:col-span-7 space-y-5">
          {latest ? (
            <FeaturedTask
              workingOn={latest.working_on}
              nextAction={latest.next_action}
              stuckSignal={latest.stuck_signal}
            />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No sessions yet — run the tab reader to start tracking your focus.
              </p>
            </div>
          )}
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
