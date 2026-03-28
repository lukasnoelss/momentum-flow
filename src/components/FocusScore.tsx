import { scoreColor } from "@/hooks/useApi";

interface FocusScoreProps {
  score: number;
  label: string;
}

const colorClasses = {
  high: { ring: "border-score-high", glow: "score-glow-high", text: "text-score-high" },
  mid: { ring: "border-score-mid", glow: "score-glow-mid", text: "text-score-mid" },
  low: { ring: "border-score-low", glow: "score-glow-low", text: "text-score-low" },
};

const FocusScore = ({ score, label }: FocusScoreProps) => {
  const level = scoreColor(score);
  const classes = colorClasses[level];

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="relative flex items-center justify-center">
        {/* Breathing glow ring */}
        <div
          className={`absolute w-44 h-44 rounded-full border ${classes.ring} ${classes.glow} animate-breathe blur-[2px]`}
        />
        {/* Score number — massive & elegant */}
        <span className={`text-8xl font-light tracking-tighter ${classes.text} relative z-10`} style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 200 }}>
          {score}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground font-medium tracking-[0.2em] uppercase">
        {label}
      </p>
    </div>
  );
};

export default FocusScore;
