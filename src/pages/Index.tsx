import { useState, useEffect } from "react";
import { Flame, Wifi, WifiOff, RefreshCw, Sun, Coffee, Moon, Rocket } from "lucide-react";
import AppShell from "@/components/AppShell";
import FocusScore from "@/components/FocusScore";
import ContextBar from "@/components/ContextBar";
import FeaturedTask from "@/components/FeaturedTask";
import SecondaryTasks from "@/components/SecondaryTasks";
import { useFocus, useMemory, useSessions, useScan, useClarify, useSkip, useToggleTask, focusLabel, scoreColor } from "@/hooks/useApi";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground">{d.time} — {d.score}</p>
      <p className="text-muted-foreground mt-0.5 line-clamp-2">{d.label}</p>
    </div>
  );
};

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
  const [otherInput, setOtherInput] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const { text: greetText, icon: GreetIcon } = greetingData();

  const { data: focus, isError: focusError, isLoading: focusLoading } = useFocus();
  const { data: memory } = useMemory();
  const { data: sessionsData } = useSessions();
  const scanMutation = useScan();
  const clarifyMutation = useClarify();
  const skipMutation = useSkip();

  // Reset "Other" input state when question changes
  useEffect(() => {
    setOtherInput("");
    setShowOtherInput(false);
  }, [focus?.question_count]);

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
        <div className="flex items-center gap-2.5">
          {streakDays > 0 && (
            <div className="streak-shimmer text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-primary/25">
              <Flame className="w-4 h-4 drop-shadow-lg" />
              <span className="text-xs font-bold">{streakDays}d streak</span>
            </div>
          )}
          <button
            onClick={() => { setWelcomeDismissed(true); scanMutation.mutate(); }}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-card border border-border/60 text-foreground hover:border-primary/30 hover:shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${scanMutation.isPending ? "animate-spin" : ""}`} />
            <span>{scanMutation.isPending ? "Scanning…" : "Sync"}</span>
          </button>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold ${
            focusError
              ? "bg-score-low/10 text-score-low border border-score-low/20"
              : "bg-score-high/10 text-score-high border border-score-high/20"
          }`}>
            {focusError ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            <span>{focusError ? "Offline" : "Live"}</span>
            {!focusError && <span className="w-1.5 h-1.5 rounded-full bg-score-high animate-pulse" />}
          </div>
        </div>
      </div>

      {scanMutation.isPending ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse max-w-xl mx-auto text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 animate-spin-slow">
            <RefreshCw className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-display text-foreground mb-3">Syncing your focus…</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Momentum is reading your active tabs and analysing your current work context.
          </p>
        </div>
      ) : isReturning ? (
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
              {focus.options?.map((opt: string, i: number) => {
                if (opt === "Other") {
                  return showOtherInput ? (
                    <div key={i} className="flex gap-2">
                      <input
                        autoFocus
                        value={otherInput}
                        onChange={(e) => setOtherInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && otherInput.trim()) {
                            clarifyMutation.mutate({ session_id: focus.session_id!, answer: otherInput.trim() });
                          }
                        }}
                        placeholder="Describe what you're doing…"
                        className="flex-1 bg-primary/8 border border-primary/30 text-foreground px-4 py-3 rounded-xl text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <button
                        onClick={() => otherInput.trim() && clarifyMutation.mutate({ session_id: focus.session_id!, answer: otherInput.trim() })}
                        disabled={!otherInput.trim() || clarifyMutation.isPending}
                        className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 transition-all"
                      >
                        →
                      </button>
                    </div>
                  ) : (
                    <button key={i} onClick={() => setShowOtherInput(true)} disabled={clarifyMutation.isPending} className="bg-primary/8 hover:bg-primary/15 border border-primary/15 text-foreground px-5 py-4 rounded-xl text-left font-medium disabled:opacity-50 transition-all">
                      Other…
                    </button>
                  );
                }
                return (
                  <button key={i} onClick={() => clarifyMutation.mutate({ session_id: focus.session_id!, answer: opt })} disabled={clarifyMutation.isPending} className="bg-primary/8 hover:bg-primary/15 border border-primary/15 text-foreground px-5 py-4 rounded-xl text-left font-medium disabled:opacity-50 transition-all">
                    {opt}
                  </button>
                );
              })}
            </div>
            {clarifyMutation.isPending && <p className="text-xs text-muted-foreground mt-4 animate-pulse">Thinking…</p>}
            <button
              onClick={() => skipMutation.mutate({ session_id: focus.session_id! })}
              disabled={skipMutation.isPending || clarifyMutation.isPending}
              className="mt-6 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              {skipMutation.isPending ? "Generating…" : "Skip questions →"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 md:items-stretch">
            {/* Left — Focus Score + AI Memory */}
            <div className="md:col-span-4 space-y-6">
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

            {/* Middle — Tasks */}
            <div className="md:col-span-5 space-y-6">
              {latest ? (
                <FeaturedTask workingOn={latest.working_on} nextAction={latest.next_action} stuckSignal={latest.stuck_signal} />
              ) : (
                <div className="relative rounded-2xl border border-primary/15 p-8 text-center overflow-hidden group hover:border-primary/30 transition-all"
                  style={{ background: 'linear-gradient(135deg, rgba(108,93,211,0.06) 0%, rgba(108,93,211,0.02) 50%, rgba(22,162,118,0.04) 100%)' }}>
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

            {/* Right — Session log */}
            <div className="md:col-span-3 flex flex-col min-h-0">
              <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase mb-3">Session log</p>
              {sessions.length === 0 ? (
                <p className="text-muted-foreground text-xs">No sessions yet.</p>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
                  {sessions.map((s, i) => {
                    const color = scoreColor(s.focus_score);
                    const pillCls = color === "high"
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                      : color === "mid"
                      ? "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                      : "bg-rose-500/15 text-rose-600 border border-rose-500/20";
                    return (
                      <div
                        key={i}
                        className="rounded-xl px-3 py-3 flex items-start gap-2 bg-card border border-border/60 hover:border-primary/20 hover:shadow-sm transition-all animate-fade-in"
                        style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-foreground truncate">{s.working_on}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(s.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${pillCls}`}>{s.focus_score}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Focus graph */}
          {sessions.length > 0 && (() => {
            const chartData = [...sessions].reverse().map((s) => ({
              time: new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              score: s.focus_score,
              label: s.working_on,
            }));
            const scores = sessions.map((s) => s.focus_score);
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const peak = sessions.reduce((best, s) => s.focus_score > (best?.focus_score ?? -1) ? s : best, null as (typeof sessions)[0] | null);
            const peakTime = peak ? new Date(peak.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
            return (
              <div className="mb-8">
                <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase mb-3">Focus today</p>
                <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/[0.05] to-transparent card-glow">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="scoreGradToday" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6C5DD3" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6C5DD3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <ReferenceArea y1={70} y2={100} fill="#16A276" fillOpacity={0.06} />
                      <ReferenceArea y1={40} y2={70} fill="#EFA327" fillOpacity={0.06} />
                      <ReferenceArea y1={0} y2={40} fill="#D65D3C" fillOpacity={0.06} />
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 12% 90%)" />
                      <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="hsl(230 8% 46%)" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(230 8% 46%)" />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={70} stroke="#16A276" strokeDasharray="3 3" strokeOpacity={0.4} />
                      <ReferenceLine y={40} stroke="#EFA327" strokeDasharray="3 3" strokeOpacity={0.4} />
                      <Area type="monotone" dataKey="score" stroke="#6C5DD3" strokeWidth={2.5} fill="url(#scoreGradToday)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mt-3">
                  {[
                    { label: "Avg focus", value: `${avg}` },
                    { label: "Sessions", value: `${sessions.length}` },
                    { label: "Peak time", value: peakTime },
                  ].map((s) => (
                    <div key={s.label} className="bg-gradient-to-br from-primary/[0.06] to-transparent rounded-2xl p-4 text-center card-glow">
                      <p className="text-2xl font-display text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 tracking-wide uppercase font-bold">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </>
      )}
    </AppShell>
  );
};

export default Index;
