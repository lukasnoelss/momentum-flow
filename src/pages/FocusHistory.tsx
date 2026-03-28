import AppShell from "@/components/AppShell";
import { useSessions } from "@/hooks/useApi";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-foreground">{d.time} — {d.score}</p>
      <p className="text-muted-foreground mt-0.5 line-clamp-2">{d.label}</p>
    </div>
  );
};

const FocusHistory = () => {
  const { data, isLoading, isError } = useSessions();
  const sessions = data?.sessions ?? [];

  const chartData = [...sessions].reverse().map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    score: s.focus_score,
    label: s.working_on,
  }));

  const scores = sessions.map((s) => s.focus_score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const peak = sessions.reduce(
    (best, s) => (s.focus_score > (best?.focus_score ?? -1) ? s : best),
    null as (typeof sessions)[0] | null
  );
  const peakTime = peak
    ? new Date(peak.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <AppShell>
      <h1 className="text-xl font-display text-foreground mb-5">Focus history</h1>

      <div className="rounded-2xl p-4 mb-5 bg-primary/[0.02]">
        {isLoading && <p className="text-muted-foreground text-xs animate-pulse text-center py-8">Loading…</p>}
        {isError && <p className="text-score-low text-xs text-center py-8">Could not reach backend.</p>}
        {!isLoading && !isError && chartData.length === 0 && (
          <p className="text-muted-foreground text-xs text-center py-8">No data yet.</p>
        )}
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(248 42% 50%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(248 42% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <ReferenceArea y1={70} y2={100} fill="hsl(157 69% 37%)" fillOpacity={0.05} />
              <ReferenceArea y1={40} y2={70} fill="hsl(37 78% 41%)" fillOpacity={0.05} />
              <ReferenceArea y1={0} y2={40} fill="hsl(17 68% 36%)" fillOpacity={0.05} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 92%)" />
              <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="hsl(220 9% 46%)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(220 9% 46%)" />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke="hsl(157 69% 37%)" strokeDasharray="3 3" strokeOpacity={0.3} />
              <ReferenceLine y={40} stroke="hsl(37 78% 41%)" strokeDasharray="3 3" strokeOpacity={0.3} />
              <Area type="monotone" dataKey="score" stroke="hsl(248 42% 50%)" strokeWidth={2} fill="url(#scoreGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Avg focus", value: avg !== null ? `${avg}` : "—" },
          { label: "Sessions", value: sessions.length > 0 ? `${sessions.length}` : "—" },
          { label: "Peak time", value: peakTime },
        ].map((s) => (
          <div key={s.label} className="bg-primary/[0.03] rounded-2xl p-4 text-center">
            <p className="text-xl font-display text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 tracking-wide uppercase">{s.label}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
};

export default FocusHistory;
