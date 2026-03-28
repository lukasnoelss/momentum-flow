import AppShell from "@/components/AppShell";
import { useSessions, scoreColor } from "@/hooks/useApi";

const pillColor = {
  high: "bg-score-high/10 text-score-high",
  mid: "bg-score-mid/10 text-score-mid",
  low: "bg-score-low/10 text-score-low",
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const SessionLog = () => {
  const { data, isLoading, isError } = useSessions();
  const sessions = data?.sessions ?? [];

  return (
    <AppShell>
      <h1 className="text-xl font-display text-foreground mb-5">Session log</h1>

      {isLoading && <p className="text-muted-foreground text-xs animate-pulse">Loading…</p>}
      {isError && <p className="text-score-low text-xs">Could not reach backend.</p>}
      {!isLoading && !isError && sessions.length === 0 && (
        <p className="text-muted-foreground text-xs">No sessions yet.</p>
      )}

      <div className="space-y-2.5">
        {sessions.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl px-4 py-3.5 flex items-start gap-3 animate-fade-in bg-primary/[0.02]"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{s.working_on}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDate(s.timestamp)} · {s.focus_label}
              </p>
              {s.next_action && (
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">→ {s.next_action}</p>
              )}
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${pillColor[scoreColor(s.focus_score)]}`}>
              {s.focus_score}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
};

export default SessionLog;
