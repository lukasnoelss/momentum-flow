import AppShell from "@/components/AppShell";
import { focusHistoryData, focusSummary } from "@/data/mockData";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-foreground">{d.time} — Score: {d.score}</p>
      {d.annotation && <p className="text-muted-foreground mt-0.5">{d.annotation}</p>}
    </div>
  );
};

const FocusHistory = () => (
  <AppShell>
    <h1 className="text-2xl font-display text-foreground mb-6">Focus history</h1>

    <div className="bg-card rounded-xl border border-border p-4 mb-5">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={focusHistoryData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(248 42% 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(248 42% 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <ReferenceArea y1={70} y2={100} fill="hsl(157 69% 37%)" fillOpacity={0.06} />
          <ReferenceArea y1={40} y2={70} fill="hsl(37 78% 41%)" fillOpacity={0.06} />
          <ReferenceArea y1={0} y2={40} fill="hsl(17 68% 36%)" fillOpacity={0.06} />
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 92%)" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(240 5% 50%)" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(240 5% 50%)" />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70} stroke="hsl(157 69% 37%)" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine y={40} stroke="hsl(37 78% 41%)" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(248 42% 50%)"
            strokeWidth={2}
            fill="url(#scoreGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    {/* Summary */}
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Avg focus", value: `${focusSummary.average}` },
        { label: "Longest streak", value: focusSummary.longestStreak },
        { label: "Peak time", value: focusSummary.peakTime },
      ].map((s) => (
        <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-display text-foreground">{s.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  </AppShell>
);

export default FocusHistory;
