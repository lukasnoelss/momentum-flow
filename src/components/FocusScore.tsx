import { scoreColor } from "@/data/mockData";

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
    <div className="flex flex-col items-center gap-3 py-6">
      <div className={`relative flex items-center justify-center`}>
        {/* Breathing ring */}
        <div
          className={`absolute w-36 h-36 rounded-full border-2 ${classes.ring} ${classes.glow} animate-breathe`}
        />
        {/* Score */}
        <span className={`text-6xl font-light tracking-tight ${classes.text} relative z-10`}>
          {score}
        </span>
      </div>
      <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
        {label}
      </p>
    </div>
  );
};

export default FocusScore;
