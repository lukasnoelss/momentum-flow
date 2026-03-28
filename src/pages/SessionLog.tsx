import AppShell from "@/components/AppShell";
import { useSessions, scoreColor } from "@/hooks/useApi";

const pillColor = {
  high: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20",
  mid: "bg-amber-500/15 text-amber-600 border border-amber-500/20",
  low: "bg-rose-500/15 text-rose-600 border border-rose-500/20",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const SessionLog = () => {
  const { data, isLoading, isError } = useSessions();
  const sessions = data?.sessions ?? [];

  return (
    <AppShell>
      <h1 className="text-xl font-display text-foreground mb-5">Session log</h1>
      {isLoading && <p className="text-muted-foreground text-xs animate-pulse">Loading…</p>}
      {isError && <p className="text-score-low text-xs">Could not reach backend.</p>}
      {!isLoading && !isError && sessions.length === 0 && <p className="text-muted-foreground text-xs">No sessions yet.</p>}
      <div className="space-y-2.5">
        {sessions.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl px-4 py-4 flex items-start gap-3 animate-fade-in bg-card border border-border/60 hover:border-primary/20 hover:shadow-sm transition-all"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate">{s.working_on}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(s.timestamp)} · {s.focus_label}</p>
              {s.next_action && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">→ {s.next_action}</p>}
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${pillColor[scoreColor(s.focus_score)]}`}>
              {s.focus_score}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
};

export default SessionLog;
