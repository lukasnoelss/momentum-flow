import { scoreColor } from "@/hooks/useApi";

interface FocusScoreProps {
  score: number;
  label: string;
}

const colorMap = {
  high: {
    glow: "score-glow-high",
    text: "text-score-high",
    inner: "orb-inner-glow-high",
    stroke: "var(--score-high-hex)",
    icon: "🎯",
  },
  mid: {
    glow: "score-glow-mid",
    text: "text-score-mid",
    inner: "orb-inner-glow-mid",
    stroke: "var(--score-mid-hex)",
    icon: "⚡",
  },
  low: {
    glow: "score-glow-low",
    text: "text-score-low",
    inner: "orb-inner-glow-low",
    stroke: "var(--score-low-hex)",
    icon: "🌊",
  },
};

const FocusScore = ({ score, label }: FocusScoreProps) => {
  const level = scoreColor(score);
  const c = colorMap[level];
  const circumference = 2 * Math.PI * 80; // r=80
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="relative flex items-center justify-center w-40 h-40">
        {/* Deep aura */}
        <div className={`absolute inset-[-20px] rounded-full ${c.glow} orb-aura`} />

        {/* Spinning gradient ring */}
        <div className="absolute inset-[-4px] rounded-full orb-ring-spin"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, ${c.stroke} 25%, transparent 50%, ${c.stroke} 75%, transparent 100%)`,
            opacity: 0.15,
          }}
        />

        {/* Glass orb */}
        <div className="absolute inset-0 rounded-full orb-glass" />

        {/* Inner glow */}
        <div className={`absolute inset-0 rounded-full ${c.inner}`} />

        {/* Progress arc */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="100" cy="100" r="80"
            fill="none"
            stroke={c.stroke}
            strokeWidth="4"
            className="orb-progress"
            style={{ strokeDashoffset: offset, strokeDasharray: circumference }}
          />
        </svg>

        {/* Score number */}
        <span
          className={`text-6xl ${c.text} relative z-10 drop-shadow-lg`}
          style={{ fontFamily: 'Inter, system-ui', fontWeight: 200, letterSpacing: '-0.04em' }}
        >
          {score}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-sm">{c.icon}</span>
        <p className={`text-xs font-bold tracking-[0.15em] uppercase ${c.text}`}>
          {label}
        </p>
      </div>
    </div>
  );
};

export default FocusScore;
