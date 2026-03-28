import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Send, Wifi, WifiOff, RefreshCw, Sun, Coffee, Moon } from "lucide-react";
import AppShell from "@/components/AppShell";
import FocusScore from "@/components/FocusScore";
import ContextBar from "@/components/ContextBar";
import FeaturedTask from "@/components/FeaturedTask";
import SecondaryTasks from "@/components/SecondaryTasks";
import { useFocus, useMemory, useSessions, useScan, useClarify, useToggleTask, focusLabel } from "@/hooks/useApi";

const greetingData = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", icon: Coffee };
  if (h < 17) return { text: "Good afternoon", icon: Sun };
  return { text: "Good evening", icon: Moon };
};

const computeStreak = (timestamps: string[]): number => {
  if (timestamps.length === 0) return 0;
  const daySet = new Set(timestamps.map((ts) => new Date(ts).toISOString().slice(0, 10)));
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

const useLiveScore = (baseScore: number | null) => {
  const [score, setScore] = useState(baseScore ?? 72);
  useEffect(() => { if (baseScore !== null) setScore(baseScore); }, [baseScore]);
  useEffect(() => {
    const id = setInterval(() => {
      setScore((s) => Math.max(0, Math.min(100, s + Math.floor(Math.random() * 5) - 2)));
    }, 5000);
    return () => clearInterval(id);
  }, []);
  return score;
};

const Index = () => {
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const { text: greetText, icon: GreetIcon } = greetingData();

  const { data: focus, isError: focusError, isLoading: focusLoading } = useFocus();
  const { data: memory } = useMemory();
  const { data: sessionsData } = useSessions();
  const scanMutation = useScan();
  const clarifyMutation = useClarify();

  const sessions = sessionsData?.sessions ?? [];
  const latest = sessions[0] ?? null;

  const rawScore = focus?.focus_score ?? null;
  const liveScore = useLiveScore(rawScore);
  const label = focusLabel(liveScore);
  const memoryText = memory?.memory_summary ?? "Run the tab reader to get your first focus analysis.";
  const streakDays = computeStreak(sessions.map((s) => s.timestamp));
  const toggleTaskMutation = useToggleTask();
  const secondaryTasks = latest?.supporting_tasks?.map((t, i) => ({ ...t, index: i })) ?? [];

  const handleToggleTask = (taskIndex: number, done: boolean) => {
    if (!latest) return;
    toggleTaskMutation.mutate({ session_id: focus?.session_id || 0, task_index: taskIndex, done });
  };

  const handleAsk = () => {
    if (!input.trim()) return;
    navigate("/chat");
    setInput("");
  };

  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const isReturning =
    latest && !focus?.is_draft && !welcomeDismissed &&
    Date.now() - new Date(latest.timestamp).getTime() < 2 * 60 * 60 * 1000;

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <GreetIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display text-foreground leading-tight">{greetText}</h1>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              {isReturning ? "Welcome back" : "Here's your momentum"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setWelcomeDismissed(true); scanMutation.mutate(); }}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            <RefreshCw className={`w-3 h-3 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            <span>{scanMutation.isPending ? "…" : "Scan"}</span>
          </button>
          <div className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-medium ${focusError ? "bg-score-low/15 text-score-low" : "bg-primary/10 text-primary"}`}>
            {focusError ? <WifiOff className="w-2.5 h-2.5" /> : <Wifi className="w-2.5 h-2.5" />}
          </div>
        </div>
      </div>

      {/* Streak banner */}
      {streakDays > 0 && !isReturning && !focus?.is_draft && (
        <div className="streak-shimmer text-primary-foreground rounded-2xl px-4 py-2.5 flex items-center gap-2 mb-6 shadow-lg shadow-primary/20">
          <Flame className="w-5 h-5 drop-shadow-lg" />
          <span className="text-sm font-bold">{streakDays} day streak</span>
          <span className="text-xs opacity-80 ml-auto">Keep it going! 🔥</span>
        </div>
      )}

      {isReturning ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
          <div className="rounded-3xl p-6 w-full">
            <h2 className="text-lg font-display text-foreground mb-3">You were working on {latest.working_on}</h2>
            <p className="text-muted-foreground text-xs mb-6">
              {(() => {
                const mins = Math.max(0, Math.floor((Date.now() - new Date(latest.timestamp).getTime()) / 60000));
                return mins < 1 ? "You just left. Jump back in?" : `You left ${mins}m ago. Pick up where you left off?`;
              })()}
            </p>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => setWelcomeDismissed(true)} className="bg-primary text-primary-foreground px-5 py-3.5 rounded-xl font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all">
                Yes, jump back in
              </button>
              <button onClick={() => { setWelcomeDismissed(true); scanMutation.mutate(); }} disabled={scanMutation.isPending} className="bg-primary/10 hover:bg-primary/20 text-primary px-5 py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all">
                Re-scan my tabs
              </button>
            </div>
          </div>
        </div>
      ) : focus?.is_draft ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
          <p className="text-[10px] text-muted-foreground font-bold mb-3 tracking-[0.2em] uppercase">Question {focus.question_count} of 3</p>
          <div className="rounded-3xl p-6 w-full">
            <h2 className="text-lg font-display text-foreground mb-6">{focus.question}</h2>
            <div className="flex flex-col gap-2.5">
              {focus.options?.map((opt: string, i: number) => (
                <button key={i} onClick={() => clarifyMutation.mutate({ session_id: focus.session_id!, answer: opt })} disabled={clarifyMutation.isPending} className="bg-primary/8 hover:bg-primary/15 border border-primary/15 text-foreground px-4 py-3.5 rounded-xl text-left text-sm font-medium disabled:opacity-50 transition-all">
                  {opt}
                </button>
              ))}
            </div>
            {clarifyMutation.isPending && <p className="text-xs text-muted-foreground mt-4 animate-pulse">Thinking…</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Focus Score Orb */}
          <div>
            {focusLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs animate-pulse">Waiting for first scan…</div>
            ) : (
              <FocusScore score={liveScore} label={label} />
            )}
            {focus?.tab_count ? (
              <p className="text-[10px] text-muted-foreground text-center -mt-2">
                {focus.tab_count} tab{focus.tab_count !== 1 ? "s" : ""} analysed
                {focus.updated_at ? ` · ${new Date(focus.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            ) : null}
          </div>

          {/* AI Memory */}
          <ContextBar message={memoryText} />

          {/* Featured Task */}
          {latest ? (
            <FeaturedTask workingOn={latest.working_on} nextAction={latest.next_action} stuckSignal={latest.stuck_signal} />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-primary/20 p-5 text-center">
              <p className="text-xs text-muted-foreground">No sessions yet — run the tab reader to start.</p>
            </div>
          )}

          {/* Secondary Tasks */}
          <SecondaryTasks tasks={secondaryTasks} onToggle={handleToggleTask} />
        </div>
      )}

      {/* Floating Chat Input */}
      {!isReturning && !focus?.is_draft && (
        <div className="sticky bottom-20 mt-8 z-40">
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-xl rounded-full px-5 py-3.5 border border-border/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(108,93,211,0.15)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask Momentum anything…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
            />
            <button onClick={handleAsk} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/30">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Index;
