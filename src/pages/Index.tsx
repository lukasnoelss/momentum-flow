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
      {/* Hero Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GreetIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display text-foreground">{greetText}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isReturning ? "Welcome back" : "Here's your momentum today"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setWelcomeDismissed(true); scanMutation.mutate(); }}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            <span>{scanMutation.isPending ? "Scanning…" : "Update data"}</span>
          </button>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${focusError ? "bg-score-low/15 text-score-low" : "bg-primary/10 text-primary"}`}>
            {focusError ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            <span>{focusError ? "Offline" : "Live"}</span>
          </div>
          {streakDays > 0 && (
            <div className="streak-shimmer text-primary-foreground px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-bold">{streakDays} day streak</span>
            </div>
          )}
        </div>
      </div>

      {isReturning ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in max-w-xl mx-auto text-center">
          <div className="rounded-3xl p-8 w-full">
            <h2 className="text-xl md:text-2xl font-display text-foreground mb-4">You were working on {latest.working_on}</h2>
            <p className="text-muted-foreground text-sm mb-8">
              {(() => {
                const mins = Math.max(0, Math.floor((Date.now() - new Date(latest.timestamp).getTime()) / 60000));
                return mins < 1 ? "You just left. Ready to jump back in?" : `You left ${mins} minute${mins !== 1 ? 's' : ''} ago. Pick up where you left off?`;
              })()}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setWelcomeDismissed(true)} className="bg-primary text-primary-foreground px-5 py-4 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all">
                Yes, jump back in
              </button>
              <button onClick={() => { setWelcomeDismissed(true); scanMutation.mutate(); }} disabled={scanMutation.isPending} className="bg-primary/10 hover:bg-primary/20 text-primary px-5 py-4 rounded-xl font-semibold disabled:opacity-50 transition-all">
                Re-scan my tabs
              </button>
            </div>
          </div>
        </div>
      ) : focus?.is_draft ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in max-w-xl mx-auto text-center">
          <p className="text-[10px] text-muted-foreground font-bold mb-4 tracking-[0.2em] uppercase">Question {focus.question_count} of 3</p>
          <div className="rounded-3xl p-8 w-full">
            <h2 className="text-xl md:text-2xl font-display text-foreground mb-8">{focus.question}</h2>
            <div className="flex flex-col gap-3">
              {focus.options?.map((opt: string, i: number) => (
                <button key={i} onClick={() => clarifyMutation.mutate({ session_id: focus.session_id!, answer: opt })} disabled={clarifyMutation.isPending} className="bg-primary/8 hover:bg-primary/15 border border-primary/15 text-foreground px-5 py-4 rounded-xl text-left font-medium disabled:opacity-50 transition-all">
                  {opt}
                </button>
              ))}
            </div>
            {clarifyMutation.isPending && <p className="text-xs text-muted-foreground mt-4 animate-pulse">Thinking…</p>}
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
            {/* Left — Focus Score + AI Memory */}
            <div className="md:col-span-5 space-y-6">
              <div className="rounded-2xl p-6">
                {focusLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm animate-pulse">Waiting for first scan…</div>
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
              <ContextBar message={memoryText} />
            </div>

            {/* Right — Tasks */}
            <div className="md:col-span-7 space-y-6">
              {latest ? (
                <FeaturedTask workingOn={latest.working_on} nextAction={latest.next_action} stuckSignal={latest.stuck_signal} />
              ) : (
                <div className="relative rounded-2xl border border-primary/15 p-8 text-center overflow-hidden group hover:border-primary/30 transition-all"
                  style={{ background: 'linear-gradient(135deg, rgba(108,93,211,0.06) 0%, rgba(108,93,211,0.02) 50%, rgba(22,162,118,0.04) 100%)' }}>
                  {/* Decorative floating dots */}
                  <div className="absolute top-4 right-6 w-2 h-2 rounded-full bg-primary/20 animate-bounce" style={{ animationDuration: '3s' }} />
                  <div className="absolute top-8 right-12 w-1.5 h-1.5 rounded-full bg-score-high/25 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                  <div className="absolute bottom-6 left-8 w-1.5 h-1.5 rounded-full bg-score-mid/25 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
                  
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">Ready to track your focus</h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                    Run the tab reader to start analysing your workflow and get personalised task suggestions.
                  </p>
                  <button
                    onClick={() => scanMutation.mutate()}
                    disabled={scanMutation.isPending}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
                    {scanMutation.isPending ? 'Scanning…' : 'Start first scan'}
                  </button>
                </div>
              )}
              <SecondaryTasks tasks={secondaryTasks} onToggle={handleToggleTask} />
            </div>
          </div>

          {/* Ask bar */}
          <div className="flex items-center gap-3 bg-card/80 backdrop-blur-xl rounded-2xl px-6 py-4 border border-border/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(108,93,211,0.12)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask Momentum anything…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
            />
            <button onClick={handleAsk} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/30">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
};

export default Index;
