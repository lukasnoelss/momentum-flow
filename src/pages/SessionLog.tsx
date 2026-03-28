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
      <h1 className="text-2xl font-display text-foreground mb-6">Session log</h1>

      {isLoading && (
        <p className="text-muted-foreground text-sm animate-pulse">Loading sessions…</p>
      )}

      {isError && (
        <p className="text-score-low text-sm">
          Could not reach backend. Make sure the server is running on port 8000.
        </p>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No sessions yet — run <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">python tab_reader.py</code> to start tracking.
        </p>
      )}

      <div className="space-y-3">
        {sessions.map((s, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border px-4 py-4 flex items-start gap-4 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{s.working_on}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(s.timestamp)} · {s.focus_label}
              </p>
              {s.next_action && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  → {s.next_action}
                </p>
              )}
              {s.stuck_signal && (
                <p className="text-xs text-score-mid mt-1 line-clamp-1">⚠ {s.stuck_signal}</p>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${pillColor[scoreColor(s.focus_score)]}`}
            >
              {s.focus_score}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
};

export default SessionLog;
