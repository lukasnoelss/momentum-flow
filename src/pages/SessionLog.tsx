import AppShell from "@/components/AppShell";
import { sessionLog, scoreColor } from "@/data/mockData";

const pillColor = {
  high: "bg-score-high/10 text-score-high",
  mid: "bg-score-mid/10 text-score-mid",
  low: "bg-score-low/10 text-score-low",
};

const SessionLog = () => (
  <AppShell>
    <h1 className="text-2xl font-display text-foreground mb-6">Session log</h1>

    <div className="space-y-3">
      {sessionLog.map((s, i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border px-4 py-4 flex items-center gap-4 animate-fade-in"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{s.task}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {s.date} · {s.completed ? "Completed" : "Left mid-way"}
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pillColor[scoreColor(s.score)]}`}
          >
            {s.score}
          </span>
        </div>
      ))}
    </div>
  </AppShell>
);

export default SessionLog;
